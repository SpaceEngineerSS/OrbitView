/**
 * Message protocol between the main thread and satellite.worker.ts.
 */

import type { SatellitePass, ObserverLocation } from '../lib/PassPrediction';
import type { ConjunctionEvent } from '../lib/ConjunctionAnalysis';

export interface TLEInitData {
    id: string;
    name: string;
    line1: string;
    line2: string;
}

export type WorkerInbound =
    | { type: 'init'; generation: number; sats: TLEInitData[] }
    | { type: 'update'; generation: number; time: number; buffer?: ArrayBuffer }
    | {
        type: 'passes';
        requestId: number;
        id: string;
        observer: ObserverLocation;
        start: number;
        end: number;
        minElevation: number;
    }
    | {
        type: 'conjunctions';
        requestId: number;
        id: string;
        start: number;
        hours: number;
        thresholdKm: number;
    };

export type WorkerOutbound =
    | { type: 'init_complete'; generation: number; count: number; failed: number }
    | { type: 'update_complete'; generation: number; time: number; positions: Float32Array }
    | { type: 'passes_result'; requestId: number; passes: SatellitePass[] }
    | { type: 'conjunctions_result'; requestId: number; events: ConjunctionEvent[] }
    | { type: 'error'; requestId?: number; generation?: number; message: string };
