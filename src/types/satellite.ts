/**
 * Satellite Type Definitions
 * Strict typing for satellite-related data structures
 * 
 * @module types/satellite
 */

// ============================================================================
// TELEMETRY TYPES
// ============================================================================

/**
 * Real-time telemetry data from satellite position calculations
 */
export interface SatelliteTelemetry {
    /** Latitude in degrees (-90 to 90) */
    latitude: number;
    /** Longitude in degrees (-180 to 180) */
    longitude: number;
    /** Altitude above Earth's surface in kilometers */
    altitude: number;
    /** Orbital velocity in km/s */
    velocity: number;
    /** Timestamp of telemetry calculation */
    timestamp: Date;
}

/**
 * Extended telemetry with velocity vectors
 */
export interface ExtendedTelemetry extends SatelliteTelemetry {
    /** Velocity vector in ECF coordinates (km/s) */
    velocityVector?: {
        x: number;
        y: number;
        z: number;
    };
    /** Position vector in ECI coordinates (km) */
    positionECI?: {
        x: number;
        y: number;
        z: number;
    };
}

// ============================================================================
// SPATIAL HASHING TYPES
// ============================================================================

/**
 * Spatial bucket containing satellite indices
 * Used for O(N) link/conjunction calculations
 */
export interface SpatialBucket {
    /** Bucket key in format "x,y,z" */
    key: string;
    /** Indices of satellites in this bucket */
    indices: number[];
}

/**
 * Spatial grid statistics for performance monitoring
 */
export interface SpatialGridStats {
    /** Number of non-empty buckets */
    bucketCount: number;
    /** Average satellites per bucket */
    avgSatsPerBucket: number;
    /** Maximum satellites in any single bucket */
    maxSatsInBucket?: number;
}

// ============================================================================
// CONJUNCTION TYPES
// ============================================================================

/**
 * Potential conjunction (close approach) between two satellites
 */
export interface Conjunction {
    /** Index of first satellite */
    satIndex1: number;
    /** Index of second satellite */
    satIndex2: number;
    /** NORAD ID of first satellite */
    noradId1: string;
    /** NORAD ID of second satellite */
    noradId2: string;
    /** Minimum distance in kilometers */
    distance: number;
    /** Time of closest approach */
    timeOfClosestApproach?: Date;
    /** Relative velocity at conjunction (km/s) */
    relativeVelocity?: number;
    /** Risk assessment level */
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Conjunction detection configuration
 */
export interface ConjunctionConfig {
    /** Distance threshold for conjunction detection (km) */
    thresholdKm: number;
    /** Enable/disable global conjunction monitoring */
    enabled: boolean;
    /** Time window for prediction (hours) */
    predictionWindowHours?: number;
}

// ============================================================================
// WORKER MESSAGE TYPES
// ============================================================================

/**
 * Messages sent TO the satellite worker
 */
export type WorkerInboundMessage =
    | { type: 'init'; data: TLEInitData[] }
    | { type: 'update'; data: UpdateData }
    | { type: 'RESET_TIME'; data?: undefined };

/**
 * Messages sent FROM the satellite worker
 */
export type WorkerOutboundMessage =
    | { type: 'init_complete'; count: number }
    | { type: 'update_complete'; positions: Float32Array; links: number[]; conjunctions?: Conjunction[]; gridStats?: SpatialGridStats }
    | { type: 'time_reset' }
    | { type: 'error'; message: string };

/**
 * TLE data for worker initialization
 */
export interface TLEInitData {
    id: string;
    line1: string;
    line2: string;
}

/**
 * Update request data
 */
export interface UpdateData {
    time: string;
    selectedId?: string | null;
    enableGlobalConjunction?: boolean;
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

/**
 * Supported export formats
 */
export type ExportFormat = 'csv' | 'json';

/**
 * Export configuration
 */
export interface ExportConfig {
    format: ExportFormat;
    includeTLE: boolean;
    includeHistory: boolean;
    historyDuration?: number; // minutes
}

// ============================================================================
// CAMERA MODES
// ============================================================================

/**
 * Available camera view modes
 */
export type CameraViewMode =
    | 'ORBIT'           // Default orbit view around Earth
    | 'SATELLITE_POV'   // First-person from satellite
    | 'COCKPIT'         // Cockpit view with velocity vector alignment
    | 'TRACKING'        // Camera tracks satellite from fixed position
    | 'FREE';           // Free camera movement

/**
 * Camera state for satellite POV mode
 */
export interface SatellitePOVState {
    /** Satellite being tracked */
    satelliteId: string;
    /** Look direction offset (degrees) */
    lookOffset?: {
        heading: number;
        pitch: number;
        roll: number;
    };
    /** Field of view in degrees */
    fov?: number;
}
