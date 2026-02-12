"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import * as satellite from 'satellite.js';
import { SatelliteData } from '@/lib/tle';

/**
 * Telemetry data computed from SGP4 propagation
 */
export interface TelemetryData {
    lat: number;
    lon: number;
    alt: number;
    velocity: number;
    period: number;
    azimuth?: number;
    elevation?: number;
    range?: number;
}

interface UseSatelliteTelemetryOptions {
    updateIntervalMs?: number;
}

/**
 * useSatelliteTelemetry - Real-time SGP4 telemetry calculation on main thread
 * 
 * For the SINGLE selected satellite, we compute position/velocity on the main thread
 * to avoid Worker roundtrip latency. This is efficient because it's only 1 satellite.
 * 
 * @param selectedSatellite - The TLE data of the selected satellite
 * @param currentDate - Current simulation time from Cesium clock
 * @param options - Configuration options
 * @returns TelemetryData with lat/lon/alt/velocity/period
 */
export function useSatelliteTelemetry(
    selectedSatellite: SatelliteData | null,
    currentDate: Date | null,
    options: UseSatelliteTelemetryOptions = {}
): TelemetryData | null {
    const { updateIntervalMs = 250 } = options;
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);

    // Parse TLE once and memoize
    const satrec = useMemo(() => {
        if (!selectedSatellite?.line1 || !selectedSatellite?.line2) {
            return null;
        }
        try {
            return satellite.twoline2satrec(selectedSatellite.line1, selectedSatellite.line2);
        } catch (e) {
            console.error('[Telemetry] Failed to parse TLE:', e);
            return null;
        }
    }, [selectedSatellite]);

    // Calculate orbital period from mean motion
    const orbitalPeriod = useMemo(() => {
        if (!satrec) return 90; // Default 90 min for LEO
        const meanMotion = satrec.no; // radians/minute
        const periodMinutes = (2 * Math.PI) / meanMotion;
        return periodMinutes;
    }, [satrec]);

    // Effect to compute telemetry at regular intervals
    useEffect(() => {
        if (!satrec || !currentDate) {
            setTelemetry(null);
            return;
        }

        const computeTelemetry = () => {
            try {
                // Propagate to current time
                const posVel = satellite.propagate(satrec, currentDate);

                if (!posVel || !posVel.position || typeof posVel.position === 'boolean') {
                    console.warn('[Telemetry] Propagation failed for', selectedSatellite?.name);
                    return;
                }

                const positionEci = posVel.position as satellite.EciVec3<number>;
                const velocityEci = posVel.velocity as satellite.EciVec3<number>;

                // Calculate GMST for coordinate conversion
                const gmst = satellite.gstime(currentDate);

                // Convert ECI to Geodetic (lat/lon/alt)
                const geodetic = satellite.eciToGeodetic(positionEci, gmst);

                // Convert radians to degrees
                const latDeg = satellite.degreesLat(geodetic.latitude);
                const lonDeg = satellite.degreesLong(geodetic.longitude);
                const altKm = geodetic.height;

                // Calculate velocity magnitude (km/s)
                const velocityMagnitude = Math.sqrt(
                    velocityEci.x ** 2 +
                    velocityEci.y ** 2 +
                    velocityEci.z ** 2
                );

                setTelemetry({
                    lat: latDeg,
                    lon: lonDeg,
                    alt: altKm,
                    velocity: velocityMagnitude,
                    period: orbitalPeriod
                });
            } catch (error) {
                console.error('[Telemetry] Computation error:', error);
            }
        };

        // Compute immediately
        computeTelemetry();

        // Set up interval for updates
        const intervalId = setInterval(computeTelemetry, updateIntervalMs);

        return () => {
            clearInterval(intervalId);
        };
    }, [satrec, currentDate, orbitalPeriod, updateIntervalMs, selectedSatellite?.name]);

    return telemetry;
}

/**
 * Calculate look angles (azimuth, elevation, range) from observer to satellite
 * Useful for ground station tracking
 */
export function calculateLookAngles(
    observerLat: number,
    observerLon: number,
    observerAlt: number,
    satelliteTLE: SatelliteData,
    date: Date
): { azimuth: number; elevation: number; range: number } | null {
    try {
        const satrec = satellite.twoline2satrec(satelliteTLE.line1, satelliteTLE.line2);
        const posVel = satellite.propagate(satrec, date);

        if (!posVel || !posVel.position || typeof posVel.position === 'boolean') {
            return null;
        }

        const positionEci = posVel.position as satellite.EciVec3<number>;
        const gmst = satellite.gstime(date);

        // Observer position
        const observerGd: satellite.GeodeticLocation = {
            latitude: satellite.degreesToRadians(observerLat),
            longitude: satellite.degreesToRadians(observerLon),
            height: observerAlt / 1000 // km
        };

        // Convert to geodetic
        const positionGd = satellite.eciToGeodetic(positionEci, gmst);

        // Calculate ECF positions
        const observerEcf = satellite.geodeticToEcf(observerGd);
        const satEcf = satellite.eciToEcf(positionEci, gmst);

        // Look angles
        const lookAngles = satellite.ecfToLookAngles(observerGd, satEcf);

        return {
            azimuth: satellite.radiansToDegrees(lookAngles.azimuth),
            elevation: satellite.radiansToDegrees(lookAngles.elevation),
            range: lookAngles.rangeSat
        };
    } catch (error) {
        console.error('[LookAngles] Calculation error:', error);
        return null;
    }
}

export default useSatelliteTelemetry;
