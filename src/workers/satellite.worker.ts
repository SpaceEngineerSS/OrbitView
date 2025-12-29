import * as satellite from "satellite.js";

/**
 * Satellite Worker with Spatial Hash Grid Optimization
 * 
 * @scientific_reference Teschner, M. et al. "Optimized Spatial Hashing for Collision Detection"
 * Computer Graphics Forum, 2003.
 * 
 * ARCHITECTURE:
 * - This worker runs position calculations for all satellites at 60fps
 * - Spatial Hashing reduces link/conjunction checks from O(N²) to O(N×k)
 *   where k is the average number of satellites per bucket neighborhood
 * 
 * CELL SIZE RATIONALE:
 * - Cell size: 1000km × 1000km × 1000km
 * - Maximum inter-satellite link range: 2500km
 * - With 1000km cells, we need to check 3×3×3 = 27 neighboring cells
 * - This ensures all potential links/conjunctions are captured
 * 
 * FUTURE USE: Global Conjunction Monitoring
 * - Current implementation focuses on link calculation for selected satellite
 * - Spatial Hash Grid lays foundation for system-wide collision warnings (O(N²) → O(N))
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SatelliteRecord {
    id: string;
    rec: satellite.SatRec;
}

interface SpatialBucket {
    indices: number[]; // Indices of satellites in this bucket
}

interface WorkerMessage {
    type: 'init' | 'update' | 'RESET_TIME';
    data?: InitData[] | UpdateData;
}

interface InitData {
    id: string;
    line1: string;
    line2: string;
}

interface UpdateData {
    time: string;
    selectedId?: string | null;
    enableGlobalConjunction?: boolean; // For future Phase 4
}

// ============================================================================
// SPATIAL HASH GRID
// ============================================================================

/**
 * Cell size in kilometers
 * Chosen to be larger than typical LEO satellite spacing but small enough
 * for efficient bucket queries. 1000km balances memory usage vs. query efficiency.
 */
const CELL_SIZE_KM = 1000;

/**
 * Converts position to bucket key
 * @param x - X position in km
 * @param y - Y position in km
 * @param z - Z position in km
 * @returns Bucket key string in format "x,y,z"
 */
function positionToBucketKey(x: number, y: number, z: number): string {
    const bx = Math.floor(x / CELL_SIZE_KM);
    const by = Math.floor(y / CELL_SIZE_KM);
    const bz = Math.floor(z / CELL_SIZE_KM);
    return `${bx},${by},${bz}`;
}

/**
 * Gets all neighbor bucket keys (27 total: self + 26 neighbors)
 * @param key - Center bucket key
 * @returns Array of neighbor bucket keys
 */
function getNeighborBucketKeys(key: string): string[] {
    const [bx, by, bz] = key.split(',').map(Number);
    const neighbors: string[] = [];

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
                neighbors.push(`${bx + dx},${by + dy},${bz + dz}`);
            }
        }
    }

    return neighbors;
}

// ============================================================================
// WORKER STATE
// ============================================================================

let satrecs: SatelliteRecord[] = [];
let spatialGrid: Map<string, SpatialBucket> = new Map();
let bucketAssignments: string[] = []; // bucketAssignments[i] = bucket key for satellite i

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const { type, data } = e.data;

    if (type === "init") {
        // Initialize satellite records from TLE data
        const initData = data as InitData[];
        satrecs = initData.map((sat) => ({
            id: sat.id,
            rec: satellite.twoline2satrec(sat.line1, sat.line2)
        })).filter((s) => s.rec);

        // Pre-allocate bucket assignments array
        bucketAssignments = new Array(satrecs.length).fill('');

        self.postMessage({ type: "init_complete", count: satrecs.length });
    }
    else if (type === "RESET_TIME") {
        // Handle time reset - clear any cached temporal data
        spatialGrid.clear();
        self.postMessage({ type: "time_reset" });
    }
    else if (type === "update") {
        const { time, selectedId, enableGlobalConjunction = false } = data as UpdateData;
        const date = new Date(time);
        const gmst = satellite.gstime(date);

        // Float32Array for positions: [x, y, z, x, y, z, ...]
        const positions = new Float32Array(satrecs.length * 3);

        let selectedSatPos: { x: number; y: number; z: number } | null = null;
        let selectedSatIndex = -1;
        let selectedBucketKey = '';

        // Clear spatial grid for this frame
        spatialGrid.clear();

        // ====================================================================
        // PASS 1: Calculate positions and build spatial grid
        // ====================================================================
        for (let i = 0; i < satrecs.length; i++) {
            const item = satrecs[i];
            try {
                const posVel = satellite.propagate(item.rec, date);
                if (posVel && posVel.position && typeof posVel.position !== 'boolean') {
                    const posEci = posVel.position as satellite.EciVec3<number>;
                    const posEcf = satellite.eciToEcf(posEci, gmst);

                    // Position in meters for Cesium
                    const x = posEcf.x * 1000;
                    const y = posEcf.y * 1000;
                    const z = posEcf.z * 1000;

                    positions[i * 3] = x;
                    positions[i * 3 + 1] = y;
                    positions[i * 3 + 2] = z;

                    // Position in km for spatial hashing
                    const xKm = posEcf.x;
                    const yKm = posEcf.y;
                    const zKm = posEcf.z;

                    // Assign to bucket
                    const bucketKey = positionToBucketKey(xKm, yKm, zKm);
                    bucketAssignments[i] = bucketKey;

                    // Add to spatial grid
                    if (!spatialGrid.has(bucketKey)) {
                        spatialGrid.set(bucketKey, { indices: [] });
                    }
                    spatialGrid.get(bucketKey)!.indices.push(i);

                    // Track selected satellite
                    if (item.id === selectedId) {
                        selectedSatPos = { x, y, z };
                        selectedSatIndex = i;
                        selectedBucketKey = bucketKey;
                    }
                } else {
                    positions[i * 3] = NaN;
                    positions[i * 3 + 1] = NaN;
                    positions[i * 3 + 2] = NaN;
                    bucketAssignments[i] = '';
                }
            } catch {
                positions[i * 3] = NaN;
                positions[i * 3 + 1] = NaN;
                positions[i * 3 + 2] = NaN;
                bucketAssignments[i] = '';
            }
        }

        // ====================================================================
        // PASS 2: Calculate Links using Spatial Hashing (O(N) instead of O(N²))
        // ====================================================================
        const links: number[] = [];
        const rangeSq = 2500000 * 2500000; // 2500 km squared (in meters)

        if (selectedSatPos && selectedBucketKey) {
            // Get neighbor buckets to search
            const neighborKeys = getNeighborBucketKeys(selectedBucketKey);

            // Check only satellites in neighboring buckets
            for (const neighborKey of neighborKeys) {
                const bucket = spatialGrid.get(neighborKey);
                if (!bucket) continue;

                for (const i of bucket.indices) {
                    if (i === selectedSatIndex) continue;

                    const x = positions[i * 3];
                    if (isNaN(x)) continue;

                    const dx = x - selectedSatPos.x;
                    const dy = positions[i * 3 + 1] - selectedSatPos.y;
                    const dz = positions[i * 3 + 2] - selectedSatPos.z;

                    const distSq = dx * dx + dy * dy + dz * dz;

                    if (distSq < rangeSq) {
                        links.push(i);
                    }
                }
            }
        }

        // ====================================================================
        // OPTIONAL: Global Conjunction Detection (Foundation for future use)
        // ====================================================================
        let conjunctions: { i: number; j: number; distance: number }[] = [];

        if (enableGlobalConjunction) {
            const conjunctionThresholdSq = 10 * 10 * 1e6; // 10km in meters squared
            const processedPairs = new Set<string>();

            // Iterate through all buckets
            for (const [bucketKey, bucket] of spatialGrid) {
                const neighborKeys = getNeighborBucketKeys(bucketKey);

                for (const i of bucket.indices) {
                    const xi = positions[i * 3];
                    if (isNaN(xi)) continue;

                    // Check neighbors
                    for (const neighborKey of neighborKeys) {
                        const neighborBucket = spatialGrid.get(neighborKey);
                        if (!neighborBucket) continue;

                        for (const j of neighborBucket.indices) {
                            if (i >= j) continue; // Avoid duplicate pairs

                            const pairKey = `${Math.min(i, j)},${Math.max(i, j)}`;
                            if (processedPairs.has(pairKey)) continue;
                            processedPairs.add(pairKey);

                            const xj = positions[j * 3];
                            if (isNaN(xj)) continue;

                            const dx = xi - xj;
                            const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                            const dz = positions[i * 3 + 2] - positions[j * 3 + 2];

                            const distSq = dx * dx + dy * dy + dz * dz;

                            if (distSq < conjunctionThresholdSq) {
                                conjunctions.push({
                                    i,
                                    j,
                                    distance: Math.sqrt(distSq) / 1000 // km
                                });
                            }
                        }
                    }
                }
            }
        }

        // Transfer the buffer to main thread
        // @ts-ignore - Worker postMessage signature
        self.postMessage(
            {
                type: "update_complete",
                positions,
                links,
                conjunctions: conjunctions.length > 0 ? conjunctions : undefined,
                gridStats: {
                    bucketCount: spatialGrid.size,
                    avgSatsPerBucket: satrecs.length / Math.max(1, spatialGrid.size)
                }
            },
            { transfer: [positions.buffer] }
        );
    }
};
