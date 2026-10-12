/// <reference lib="webworker" />
/**
 * Analysis worker: pass predictions, close-approach screening and the
 * "tonight" list. Kept apart from the frame worker so a long screening run
 * never freezes the globe.
 */

import * as satellite from 'satellite.js';
import { predictPassesForSatrec } from '../lib/PassPrediction';
import { screenConjunctions, type ScreeningObject } from '../lib/ConjunctionAnalysis';
import { nightWindow, tonightPasses } from '../lib/tonight';
import type { AnalysisInbound, AnalysisOutbound } from '../types/satellite';

declare const self: DedicatedWorkerGlobalScope;

let records: ScreeningObject[] = [];
let byId = new Map<string, ScreeningObject>();

function post(msg: AnalysisOutbound) {
    self.postMessage(msg);
}

function find(id: string): ScreeningObject {
    const r = byId.get(id);
    if (!r) throw new Error(`Unknown object ${id}`);
    return r;
}

function handle(msg: AnalysisInbound) {
    switch (msg.type) {
        case 'init':
            records = msg.sats.map((s) => ({ id: s.id, name: s.name, rec: satellite.twoline2satrec(s.line1, s.line2) }));
            byId = new Map(records.map((r) => [r.id, r]));
            return;

        case 'passes': {
            const passes = predictPassesForSatrec(find(msg.id).rec, msg.observer, new Date(msg.start), new Date(msg.end), msg.minElevation);
            post({ type: 'passes_result', requestId: msg.requestId, passes });
            return;
        }

        case 'conjunctions': {
            const events = screenConjunctions(find(msg.id), records, {
                start: new Date(msg.start), hours: msg.hours, thresholdKm: msg.thresholdKm,
            });
            post({ type: 'conjunctions_result', requestId: msg.requestId, events });
            return;
        }

        case 'tonight': {
            const window = nightWindow(msg.observer, msg.from);
            const objects = msg.sats.map((s) => ({ id: s.id, name: s.name, rec: satellite.twoline2satrec(s.line1, s.line2) }));
            const passes = window ? tonightPasses(objects, msg.observer, window, msg.minElevation) : [];
            post({ type: 'tonight_result', requestId: msg.requestId, window, passes });
            return;
        }
    }
}

self.onmessage = (e: MessageEvent<AnalysisInbound>) => {
    try {
        handle(e.data);
    } catch (err) {
        const m = e.data;
        post({ type: 'error', requestId: 'requestId' in m ? m.requestId : undefined, message: err instanceof Error ? err.message : String(err) });
    }
};
