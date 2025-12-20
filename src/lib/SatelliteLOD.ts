/**
 * Satellite LOD (Level of Detail) Manager
 * 
 * Optimizes rendering performance when displaying thousands of satellites
 * by dynamically adjusting detail levels based on:
 * - Camera zoom/distance
 * - Satellite importance (selected, favorites, ISS, etc.)
 * - Screen position and visibility
 * 
 * @module SatelliteLOD
 */

import { SpaceObject } from './space-objects';

export interface LODConfig {
    maxVisibleSatellites: number;
    nearDistance: number;      // km - full detail
    mediumDistance: number;    // km - reduced detail  
    farDistance: number;       // km - minimal/clustered
    priorityTypes: string[];   // Always show these types
    enableClustering: boolean;
}

export const DEFAULT_LOD_CONFIG: LODConfig = {
    maxVisibleSatellites: 500,
    nearDistance: 5000,
    mediumDistance: 20000,
    farDistance: 50000,
    priorityTypes: ['ISS', 'JWST', 'STARLINK', 'GPS'],
    enableClustering: true
};

export interface LODLevel {
    level: 'full' | 'medium' | 'minimal' | 'clustered' | 'hidden';
    showLabel: boolean;
    showOrbit: boolean;
    iconScale: number;
}

export interface SatelliteWithLOD {
    satellite: SpaceObject;
    lod: LODLevel;
    priority: number;
    clusterId?: string;
}

/**
 * Calculate priority score for a satellite
 * Higher priority = more likely to be shown with full detail
 */
function calculatePriority(
    satellite: SpaceObject,
    selectedId: string | null,
    favoriteIds: string[],
    config: LODConfig
): number {
    let priority = 0;

    // Selected satellite gets highest priority
    if (satellite.id === selectedId) {
        priority += 1000;
    }

    // Favorites get high priority
    if (favoriteIds.includes(satellite.id)) {
        priority += 500;
    }

    // Priority types (ISS, GPS, etc.)
    const upperName = satellite.name.toUpperCase();
    for (const type of config.priorityTypes) {
        if (upperName.includes(type)) {
            priority += 100;
            break;
        }
    }

    // Deep space objects are interesting (check category, not type)
    if (satellite.category === 'DEEP_SPACE') {
        priority += 200;
    }

    // LEO satellites get a small priority boost
    if (satellite.category === 'LEO' || satellite.type === 'TLE') {
        priority += 10;
    }

    return priority;
}

/**
 * Determine LOD level based on zoom and priority
 */
function determineLOD(
    priority: number,
    cameraAltitude: number,
    config: LODConfig
): LODLevel {
    // High priority satellites always get full detail
    if (priority >= 500) {
        return {
            level: 'full',
            showLabel: true,
            showOrbit: true,
            iconScale: 1.0
        };
    }

    // Camera altitude determines base level
    if (cameraAltitude < config.nearDistance) {
        return {
            level: 'full',
            showLabel: true,
            showOrbit: true,
            iconScale: 1.0
        };
    }

    if (cameraAltitude < config.mediumDistance) {
        return {
            level: 'medium',
            showLabel: priority > 100,
            showOrbit: priority > 50,
            iconScale: 0.8
        };
    }

    if (cameraAltitude < config.farDistance) {
        return {
            level: 'minimal',
            showLabel: priority > 200,
            showOrbit: false,
            iconScale: 0.5
        };
    }

    // Very far - cluster or hide
    if (config.enableClustering) {
        return {
            level: 'clustered',
            showLabel: false,
            showOrbit: false,
            iconScale: 0.3
        };
    }

    return {
        level: 'hidden',
        showLabel: false,
        showOrbit: false,
        iconScale: 0
    };
}

/**
 * Simple grid-based clustering
 */
function assignCluster(lat: number, lon: number, gridSize: number = 10): string {
    const latBucket = Math.floor(lat / gridSize);
    const lonBucket = Math.floor(lon / gridSize);
    return `cluster-${latBucket}-${lonBucket}`;
}

/**
 * Process satellites with LOD system
 * Returns optimized list of satellites to render
 */
export function processSatellitesWithLOD(
    satellites: SpaceObject[],
    selectedId: string | null,
    favoriteIds: string[],
    cameraAltitude: number,
    config: LODConfig = DEFAULT_LOD_CONFIG
): SatelliteWithLOD[] {
    // Calculate priority for all satellites
    const withPriority = satellites.map(satellite => ({
        satellite,
        priority: calculatePriority(satellite, selectedId, favoriteIds, config),
        lod: { level: 'full' as const, showLabel: false, showOrbit: false, iconScale: 1 }
    }));

    // Sort by priority (highest first)
    withPriority.sort((a, b) => b.priority - a.priority);

    // Apply LOD levels
    const result: SatelliteWithLOD[] = [];
    const clusterCounts: Record<string, number> = {};

    for (let i = 0; i < withPriority.length; i++) {
        const item = withPriority[i];
        const lod = determineLOD(item.priority, cameraAltitude, config);

        // Skip hidden satellites
        if (lod.level === 'hidden') continue;

        // Handle clustering
        if (lod.level === 'clustered' && config.enableClustering) {
            // For clustered satellites, we need telemetry data
            // This is a simplified version - in practice, you'd use lat/lon
            const clusterId = `cluster-${Math.floor(i / 50)}`;
            if (!clusterCounts[clusterId]) {
                clusterCounts[clusterId] = 0;
                // Only add first satellite as cluster representative
                result.push({
                    ...item,
                    lod,
                    clusterId
                });
            }
            clusterCounts[clusterId]++;
            continue;
        }

        // Limit total visible satellites
        if (result.length >= config.maxVisibleSatellites && item.priority < 100) {
            continue;
        }

        result.push({
            ...item,
            lod
        });
    }

    return result;
}

/**
 * Get recommended config based on device performance
 */
export function getRecommendedConfig(isMobile: boolean): LODConfig {
    if (isMobile) {
        return {
            ...DEFAULT_LOD_CONFIG,
            maxVisibleSatellites: 200,
            enableClustering: true
        };
    }

    return DEFAULT_LOD_CONFIG;
}
