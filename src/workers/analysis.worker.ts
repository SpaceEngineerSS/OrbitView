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
import type { AnalysisInbound, AnalysisOutbound, TLEInitData } from '../types/satellite';

declare const self: DedicatedWorkerGlobalScope;

// Only the element sets are kept on init; satrecs are made when needed.
// Converting all ~30k up front took seconds and delayed the first pass list.
let tles = new Map<string, TLEInitData>();
const recs = new Map<string, ScreeningObject>();
let all: ScreeningObject[] | null = null;

function post(msg: AnalysisOutbound) {
    self.postMessage(msg);
}

function find(id: string): ScreeningObject {
    let r = recs.get(id);
    if (r) return r;
    const t = tles.get(id);
    if (!t) throw new Error(`Unknown object ${id}`);
    r = { id: t.id, name: t.name, rec: satellite.twoline2satrec(t.line1, t.line2) };
    recs.set(id, r);
    return r;
}

/** Every object, for close-approach screening; built on the first request. */
function everything(): ScreeningObject[] {
    if (!all) all = Array.from(tles.keys(), find);
    return all;
}

function handle(msg: AnalysisInbound) {
    switch (msg.type) {
        case 'init':
            tles = new Map(msg.sats.map((s) => [s.id, s]));
            recs.clear();
            all = null;
            return;

        case 'passes': {
            const passes = predictPassesForSatrec(find(msg.id).rec, msg.observer, new Date(msg.start), new Date(msg.end), msg.minElevation);
            post({ type: 'passes_result', requestId: msg.requestId, passes });
            return;
        }

        case 'conjunctions': {
            const events = screenConjunctions(find(msg.id), everything(), {
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
