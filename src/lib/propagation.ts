/**
 * Main-thread side of the two workers.
 *
 * - Frame worker: positions for the visible set, one request in flight at a
 *   time, frames from an older catalog generation dropped.
 * - Analysis worker: created on first use; passes, screening and tonight
 *   requests are promises.
 */

import type { SpaceObject } from './space-objects';
import type { TLEInitData, FrameInbound, FrameOutbound, AnalysisInbound, AnalysisOutbound } from '@/types/satellite';
import type { SatellitePass, ObserverLocation } from './PassPrediction';
import type { ConjunctionEvent } from './ConjunctionAnalysis';
import type { TonightPass } from './tonight';

type FrameListener = (positions: Float32Array, time: number, computeMs: number) => void;

interface Pending { resolve: (v: unknown) => void; reject: (e: Error) => void }

class PropagationEngine {
    private frame: Worker | null = null;
    private analysis: Worker | null = null;
    private generation = 0;
    private ready = false;
    private inFlight = false;
    private spare: ArrayBuffer | undefined;
    private listeners = new Set<FrameListener>();
    private requestId = 0;
    private pending = new Map<number, Pending>();
    private sats: TLEInitData[] = [];
    /** Object id at each index of the position buffer */
    ids: string[] = [];

    private frameWorker(): Worker {
        if (this.frame) return this.frame;
        const w = new Worker(new URL('../workers/satellite.worker.ts', import.meta.url));
        w.onmessage = (e: MessageEvent<FrameOutbound>) => this.onFrameMessage(e.data);
        w.onerror = () => { this.inFlight = false; };
        this.frame = w;
        return w;
    }

    private analysisWorker(): Worker {
        if (this.analysis) return this.analysis;
        const w = new Worker(new URL('../workers/analysis.worker.ts', import.meta.url));
        w.onmessage = (e: MessageEvent<AnalysisOutbound>) => this.onAnalysisMessage(e.data);
        w.onerror = (e) => {
            const err = new Error(e.message || 'Analysis worker error');
            this.pending.forEach((p) => p.reject(err));
            this.pending.clear();
        };
        this.analysis = w;
        if (this.sats.length) this.sendAnalysis({ type: 'init', sats: this.sats });
        return w;
    }

    private sendFrame(msg: FrameInbound, transfer: Transferable[] = []) {
        this.frameWorker().postMessage(msg, transfer);
    }

    private sendAnalysis(msg: AnalysisInbound) {
        this.analysisWorker().postMessage(msg);
    }

    private onFrameMessage(msg: FrameOutbound) {
        switch (msg.type) {
            case 'init_complete':
                if (msg.generation === this.generation) this.ready = true;
                return;
            case 'update_complete':
                this.inFlight = false;
                if (msg.generation !== this.generation) return;
                this.listeners.forEach((l) => l(msg.positions, msg.time, msg.computeMs));
                if (msg.positions.byteLength) this.spare = msg.positions.buffer as ArrayBuffer;
                return;
            case 'error':
                this.inFlight = false;
                if (process.env.NODE_ENV !== 'production') console.warn('[frame worker]', msg.message);
                return;
        }
    }

    private onAnalysisMessage(msg: AnalysisOutbound) {
        const p = msg.requestId !== undefined ? this.pending.get(msg.requestId) : undefined;
        if (msg.requestId !== undefined) this.pending.delete(msg.requestId);
        if (!p) return;
        switch (msg.type) {
            case 'passes_result': p.resolve(msg.passes); return;
            case 'conjunctions_result': p.resolve(msg.events); return;
            case 'tonight_result': p.resolve({ window: msg.window, passes: msg.passes }); return;
            case 'error': p.reject(new Error(msg.message)); return;
        }
    }

    /** Hand a new catalog to both workers. Call before any component asks about it. */
    load(objects: SpaceObject[]) {
        const tle = objects.filter((o) => o.type === 'TLE' && o.tle);
        this.generation++;
        this.ready = false;
        this.inFlight = false;
        this.spare = undefined;
        this.ids = tle.map((o) => o.id);
        this.sats = tle.map((o) => ({ id: o.id, name: o.name, line1: o.tle!.line1, line2: o.tle!.line2 }));
        this.sendFrame({ type: 'init', generation: this.generation, sats: this.sats });
        if (this.analysis) this.sendAnalysis({ type: 'init', sats: this.sats });
    }

    /** Only these buffer indices are propagated from now on. */
    setVisible(indices: Int32Array) {
        if (!this.frame) return;
        this.sendFrame({ type: 'visible', generation: this.generation, indices });
    }

    /** Ask for positions at `time`; returns false if a frame is still being computed. */
    requestFrame(time: number): boolean {
        if (!this.ready || this.inFlight) return false;
        this.inFlight = true;
        const buffer = this.spare;
        this.spare = undefined;
        this.sendFrame({ type: 'update', generation: this.generation, time, buffer }, buffer ? [buffer] : []);
        return true;
    }

    onFrame(l: FrameListener): () => void {
        this.listeners.add(l);
        return () => { this.listeners.delete(l); };
    }

    private request<T>(build: (requestId: number) => AnalysisInbound): Promise<T> {
        const requestId = ++this.requestId;
        return new Promise<T>((resolve, reject) => {
            this.pending.set(requestId, { resolve: resolve as (v: unknown) => void, reject });
            this.sendAnalysis(build(requestId));
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

    tonight(sats: TLEInitData[], observer: ObserverLocation, from: Date, minElevation: number) {
        return this.request<{ window: { start: number; end: number } | null; passes: TonightPass[] }>((requestId) => ({
            type: 'tonight', requestId, sats, observer, from: from.getTime(), minElevation,
        }));
    }
}

let engine: PropagationEngine | null = null;

export function getEngine(): PropagationEngine {
    if (!engine) engine = new PropagationEngine();
    return engine;
}
