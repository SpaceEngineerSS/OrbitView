/// <reference lib="webworker" />
/**
 * Propagation worker.
 *
 * - `update`: propagates the whole catalog with SGP4 and returns Earth-fixed
 *   positions (metres) in a Float32Array. The main thread hands the buffer
 *   back with the next request so no new memory is allocated per frame.
 * - `passes` / `conjunctions`: heavier one-off analyses for the selected
 *   object, kept off the main thread.
 *
 * Every catalog load gets a `generation` number; results from an older
 * generation are ignored by the client.
 */

import * as satellite from 'satellite.js';
import { predictPassesForSatrec } from '../lib/PassPrediction';
import { screenConjunctions, type ScreeningObject } from '../lib/ConjunctionAnalysis';
import type { WorkerInbound, WorkerOutbound } from '../types/satellite';

declare const self: DedicatedWorkerGlobalScope;

let generation = 0;
let records: ScreeningObject[] = [];
let spare: Float32Array[] = [];

function post(msg: WorkerOutbound, transfer: Transferable[] = []) {
    self.postMessage(msg, transfer);
}

function takeBuffer(size: number): Float32Array {
    while (spare.length) {
        const b = spare.pop()!;
        if (b.length === size) return b;
    }
    return new Float32Array(size);
}

function handle(msg: WorkerInbound) {
    switch (msg.type) {
        case 'init': {
            generation = msg.generation;
            spare = [];
            let failed = 0;
            records = msg.sats.map((s) => {
                const rec = satellite.twoline2satrec(s.line1, s.line2);
                if (rec.error) failed++;
                return { id: s.id, name: s.name, rec };
            });
            post({ type: 'init_complete', generation, count: records.length, failed });
            return;
        }

        case 'update': {
            if (msg.generation !== generation) return;
            if (msg.buffer && msg.buffer.byteLength === records.length * 12) {
                spare.push(new Float32Array(msg.buffer));
            }
            const positions = takeBuffer(records.length * 3);
            const date = new Date(msg.time);
            const gmst = satellite.gstime(date);

            for (let i = 0; i < records.length; i++) {
                const rec = records[i].rec;
                const pv = satellite.propagate(rec, date);
                const p = pv?.position;
                if (!p || rec.error || !Number.isFinite(p.x)) {
                    positions[i * 3] = NaN;
                    positions[i * 3 + 1] = NaN;
                    positions[i * 3 + 2] = NaN;
                    continue;
                }
                const ecf = satellite.eciToEcf(p, gmst);
                positions[i * 3] = ecf.x * 1000;
                positions[i * 3 + 1] = ecf.y * 1000;
                positions[i * 3 + 2] = ecf.z * 1000;
            }

            post({ type: 'update_complete', generation, time: msg.time, positions }, [positions.buffer]);
            return;
        }

        case 'passes': {
            const target = records.find((r) => r.id === msg.id);
            if (!target) throw new Error(`Unknown object ${msg.id}`);
            const passes = predictPassesForSatrec(
                target.rec, msg.observer, new Date(msg.start), new Date(msg.end), msg.minElevation
            );
            post({ type: 'passes_result', requestId: msg.requestId, passes });
            return;
        }

        case 'conjunctions': {
            const target = records.find((r) => r.id === msg.id);
            if (!target) throw new Error(`Unknown object ${msg.id}`);
            const events = screenConjunctions(target, records, {
                start: new Date(msg.start), hours: msg.hours, thresholdKm: msg.thresholdKm,
            });
            post({ type: 'conjunctions_result', requestId: msg.requestId, events });
            return;
        }
    }
}

self.onmessage = (e: MessageEvent<WorkerInbound>) => {
    try {
        handle(e.data);
    } catch (err) {
        const msg = e.data;
        post({
            type: 'error',
            requestId: 'requestId' in msg ? msg.requestId : undefined,
            generation: 'generation' in msg ? msg.generation : undefined,
            message: err instanceof Error ? err.message : String(err),
        });
    }
};
