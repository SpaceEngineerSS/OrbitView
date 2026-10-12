/**
 * Message protocols for the two workers.
 */

import type { SatellitePass, ObserverLocation } from '../lib/PassPrediction';
import type { ConjunctionEvent } from '../lib/ConjunctionAnalysis';
import type { TonightPass } from '../lib/tonight';

export interface TLEInitData {
    id: string;
    name: string;
    line1: string;
    line2: string;
}

/* Frame worker (satellite.worker.ts) */

export type FrameInbound =
    | { type: 'init'; generation: number; sats: TLEInitData[]; debug?: boolean }
    | { type: 'visible'; generation: number; indices: Int32Array }
    | { type: 'update'; generation: number; time: number; buffer?: ArrayBuffer };

export type FrameOutbound =
    | { type: 'hello' }
    | { type: 'init_complete'; generation: number; count: number }
    | { type: 'update_complete'; generation: number; time: number; positions: Float32Array; computeMs: number }
    | { type: 'error'; message: string };

/* Analysis worker (analysis.worker.ts) */

export type AnalysisInbound =
    | { type: 'init'; sats: TLEInitData[] }
    | { type: 'passes'; requestId: number; id: string; observer: ObserverLocation; start: number; end: number; minElevation: number }
    | { type: 'conjunctions'; requestId: number; id: string; start: number; hours: number; thresholdKm: number }
    | { type: 'tonight'; requestId: number; sats: TLEInitData[]; observer: ObserverLocation; from: number; minElevation: number };

export type AnalysisOutbound =
    | { type: 'hello' }
    | { type: 'passes_result'; requestId: number; passes: SatellitePass[] }
    | { type: 'conjunctions_result'; requestId: number; events: ConjunctionEvent[] }
    | { type: 'tonight_result'; requestId: number; window: { start: number; end: number } | null; passes: TonightPass[] }
    | { type: 'error'; requestId?: number; message: string };
