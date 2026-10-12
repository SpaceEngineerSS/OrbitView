/// <reference lib="webworker" />
/**
 * Frame worker: positions for everything that is drawn.
 *
 * Only the objects in the visible set are propagated (the main thread sends
 * it whenever the filter or catalog changes). The inner loop computes the
 * Julian date and sidereal angle once per frame, calls SGP4 directly and
 * rotates TEME → Earth-fixed inline into the output buffer. The buffer is
 * handed back by the main thread with the next request, so a frame allocates
 * nothing beyond what SGP4 itself returns.
 *
 * Heavier one-off analyses (passes, screening, tonight) live in
 * analysis.worker.ts so they never stall the globe.
 */

import * as satellite from 'satellite.js';
import type { FrameInbound, FrameOutbound } from '../types/satellite';
import { propagateInto } from '../lib/frameMath';

declare const self: DedicatedWorkerGlobalScope;

let generation = 0;
let recs: satellite.SatRec[] = [];
let visible: Int32Array = new Int32Array(0);
let spare: Float32Array | null = null;

function post(msg: FrameOutbound, transfer: Transferable[] = []) {
    self.postMessage(msg, transfer);
}

function handle(msg: FrameInbound) {
    switch (msg.type) {
        case 'init': {
            generation = msg.generation;
            spare = null;
            recs = msg.sats.map((s) => satellite.twoline2satrec(s.line1, s.line2));
            visible = new Int32Array(recs.length).map((_, i) => i);
            post({ type: 'init_complete', generation, count: recs.length });
            return;
        }
        case 'visible': {
            if (msg.generation !== generation) return;
            visible = msg.indices;
            return;
        }
        case 'update': {
            if (msg.generation !== generation) return;
            const size = recs.length * 3;
            let out = msg.buffer && msg.buffer.byteLength === size * 4 ? new Float32Array(msg.buffer) : spare;
            spare = null;
            if (!out || out.length !== size) out = new Float32Array(size).fill(NaN);
            const t0 = performance.now();
            propagateInto(out, visible, recs, new Date(msg.time));
            post({
                type: 'update_complete',
                generation,
                time: msg.time,
                positions: out,
                computeMs: performance.now() - t0,
            }, [out.buffer]);
            return;
        }
    }
}

self.onmessage = (e: MessageEvent<FrameInbound>) => {
    try {
        handle(e.data);
    } catch (err) {
        post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
};
