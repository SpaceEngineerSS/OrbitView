/**
 * Main-thread side of satellite.worker.ts.
 *
 * One worker per page. The globe asks for positions with `requestFrame()`;
 * analyses use the promise-returning `passes()` / `conjunctions()`.
 * Only one frame request is in flight at a time, and a frame from an older
 * catalog generation is dropped.
 */

import type { SpaceObject } from './space-objects';
import type { WorkerInbound, WorkerOutbound } from '@/types/satellite';
import type { SatellitePass, ObserverLocation } from './PassPrediction';
import type { ConjunctionEvent } from './ConjunctionAnalysis';

type FrameListener = (positions: Float32Array, time: number) => void;

interface Pending<T> { resolve: (v: T) => void; reject: (e: Error) => void }

class PropagationEngine {
    private worker: Worker | null = null;
    private generation = 0;
    private ready = false;
    private inFlight = false;
    private spare: ArrayBuffer | undefined;
    private listeners = new Set<FrameListener>();
    private requestId = 0;
    private pending = new Map<number, Pending<unknown>>();
    /** Index of each object id in the position buffer */
    ids: string[] = [];

    private ensure(): Worker {
        if (this.worker) return this.worker;
        const w = new Worker(new URL('../workers/satellite.worker.ts', import.meta.url));
        w.onmessage = (e: MessageEvent<WorkerOutbound>) => this.onMessage(e.data);
        w.onerror = (e) => {
            // A crash inside the worker: unblock the frame loop and fail pending requests.
            this.inFlight = false;
            const err = new Error(e.message || 'Propagation worker error');
            this.pending.forEach((p) => p.reject(err));
            this.pending.clear();
        };
        this.worker = w;
        return w;
    }

    private send(msg: WorkerInbound, transfer: Transferable[] = []) {
        this.ensure().postMessage(msg, transfer);
    }

    private onMessage(msg: WorkerOutbound) {
        switch (msg.type) {
            case 'init_complete':
                if (msg.generation === this.generation) this.ready = true;
                return;
            case 'update_complete':
                this.inFlight = false;
                if (msg.generation !== this.generation) return;
                this.listeners.forEach((l) => l(msg.positions, msg.time));
                // Hand the buffer back for the next frame.
                if (msg.positions.byteLength) this.spare = msg.positions.buffer as ArrayBuffer;
                return;
            case 'passes_result':
            case 'conjunctions_result': {
                const p = this.pending.get(msg.requestId);
                this.pending.delete(msg.requestId);
                p?.resolve(msg.type === 'passes_result' ? msg.passes : msg.events);
                return;
            }
            case 'error': {
                if (msg.requestId !== undefined) {
                    const p = this.pending.get(msg.requestId);
                    this.pending.delete(msg.requestId);
                    p?.reject(new Error(msg.message));
                } else {
                    this.inFlight = false;
                }
                if (process.env.NODE_ENV !== 'production') console.warn('[propagation]', msg.message);
                return;
            }
        }
    }

    load(objects: SpaceObject[]) {
        const tle = objects.filter((o) => o.type === 'TLE' && o.tle);
        this.generation++;
        this.ready = false;
        this.inFlight = false;
        this.spare = undefined;
        this.ids = tle.map((o) => o.id);
        this.send({
            type: 'init',
            generation: this.generation,
            sats: tle.map((o) => ({ id: o.id, name: o.name, line1: o.tle!.line1, line2: o.tle!.line2 })),
        });
    }

    /** Ask for positions at `time`. Ignored while a frame is still being computed. */
    requestFrame(time: number) {
        if (!this.ready || this.inFlight) return;
        this.inFlight = true;
        const buffer = this.spare;
        this.spare = undefined;
        this.send({ type: 'update', generation: this.generation, time, buffer }, buffer ? [buffer] : []);
    }

    onFrame(l: FrameListener): () => void {
        this.listeners.add(l);
        return () => { this.listeners.delete(l); };
    }

    private request<T>(build: (requestId: number) => WorkerInbound): Promise<T> {
        const requestId = ++this.requestId;
        return new Promise<T>((resolve, reject) => {
            this.pending.set(requestId, { resolve: resolve as (v: unknown) => void, reject });
            this.send(build(requestId));
        });
    }

    passes(id: string, observer: ObserverLocation, start: Date, end: Date, minElevation: number) {
        return this.request<SatellitePass[]>((requestId) => ({
            type: 'passes', requestId, id, observer, start: start.getTime(), end: end.getTime(), minElevation,
        }));
    }

    conjunctions(id: string, start: Date, hours: number, thresholdKm: number) {
        return this.request<ConjunctionEvent[]>((requestId) => ({
            type: 'conjunctions', requestId, id, start: start.getTime(), hours, thresholdKm,
        }));
    }
}

let engine: PropagationEngine | null = null;

export function getEngine(): PropagationEngine {
    if (!engine) engine = new PropagationEngine();
    return engine;
}
