"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import { Entity, PolylineGraphics, useCesium } from "resium";
import * as Cesium from "cesium";
import * as satellite from "satellite.js";
import { SpaceObject } from "@/lib/space-objects";
import { calculateGroundTrack, calculateFootprintRadius, generateFootprintCircle } from "@/lib/GroundTrack";

/**
 * Orbit path colors - Yellow for visibility
 */
const FUTURE_ORBIT_COLOR = Cesium.Color.YELLOW;
const PAST_ORBIT_COLOR = Cesium.Color.YELLOW.withAlpha(0.2);
const GROUND_TRACK_FUTURE = Cesium.Color.CYAN.withAlpha(0.8);
const GROUND_TRACK_PAST = new Cesium.PolylineDashMaterialProperty({
    color: Cesium.Color.RED.withAlpha(0.7)
});

interface SatelliteExtrasProps {
    selectedId?: string;
    objects: SpaceObject[];
    settings: any;
    observerPosition?: any;
    selectedSatPos: Cesium.Cartesian3 | null;
}

// Maximum points safety limit - high for GEO 24h orbits
const MAX_ORBIT_POINTS = 4000;

// Fixed step size for uniform resolution
const ORBIT_STEP_SECONDS = 60; // 1 minute steps for all orbit types

/**
 * Propagate satellite position to ECI coordinates
 * Returns ECI position (not converted to ECF yet - for inertial rendering)
 */
function propagateToECI(satrec: satellite.SatRec, time: Date): satellite.EciVec3<number> | null {
    try {
        const posVel = satellite.propagate(satrec, time);

        if (!posVel || !posVel.position || typeof posVel.position === 'boolean') {
            return null;
        }

        return posVel.position as satellite.EciVec3<number>;
    } catch {
        return null;
    }
}

/**
 * Convert ECI position to Cesium Cartesian3 using fixed GMST
 * Using fixed GMST shows the INERTIAL orbit (true Kepler ring)
 * instead of ground track
 */
function eciToCartesian(posEci: satellite.EciVec3<number>, fixedGmst: number): Cesium.Cartesian3 {
    const posEcf = satellite.eciToEcf(posEci, fixedGmst);
    return new Cesium.Cartesian3(
        posEcf.x * 1000,
        posEcf.y * 1000,
        posEcf.z * 1000
    );
}

/**
 * Calculate INERTIAL orbit positions asynchronously
 * Uses fixed GMST (epoch time) for all points to show true Kepler orbit ring
 */
function calculateOrbitPositionsAsync(
    tle: { line1: string; line2: string },
    currentTime: Date,
    callback: (result: { past: Cesium.Cartesian3[]; future: Cesium.Cartesian3[] }) => void
): void {
    // Use setTimeout to defer calculation to next event loop tick
    setTimeout(() => {
        try {
            const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
            const meanMotion = satrec.no; // rad/min
            const periodMinutes = (2 * Math.PI) / meanMotion;

            // Calculate duration: 1 full orbital period in each direction
            const durationSeconds = periodMinutes * 60;

            // Calculate total points needed for one period
            const totalPointsPerPeriod = Math.ceil(durationSeconds / ORBIT_STEP_SECONDS);

            // Apply safety cap (half for past, half for future)
            const pointsPerPeriod = Math.min(totalPointsPerPeriod, MAX_ORBIT_POINTS / 2);

            // Recalculate actual step size if capped
            const actualStepSeconds = durationSeconds / pointsPerPeriod;

            // CRITICAL: Calculate FIXED GMST at epoch (current time)
            // This renders the INERTIAL orbit (true Kepler ring in space)
            // instead of the ground track (which varies with Earth rotation)
            const fixedGmst = satellite.gstime(currentTime);

            console.debug(`[OrbitPath] Period: ${periodMinutes.toFixed(1)}min, Step: ${actualStepSeconds.toFixed(0)}s, Points: ${pointsPerPeriod}x2 (INERTIAL)`);

            const pastPositions: Cesium.Cartesian3[] = [];
            const futurePositions: Cesium.Cartesian3[] = [];

            // Calculate past orbit (1 full period back)
            for (let i = pointsPerPeriod; i >= 0; i--) {
                const time = new Date(currentTime.getTime() - i * actualStepSeconds * 1000);
                const posEci = propagateToECI(satrec, time);
                if (posEci) {
                    pastPositions.push(eciToCartesian(posEci, fixedGmst));
                }
            }

            // Calculate future orbit (1 full period forward)
            for (let i = 0; i <= pointsPerPeriod; i++) {
                const time = new Date(currentTime.getTime() + i * actualStepSeconds * 1000);
                const posEci = propagateToECI(satrec, time);
                if (posEci) {
                    futurePositions.push(eciToCartesian(posEci, fixedGmst));
                }
            }

            callback({ past: pastPositions, future: futurePositions });
        } catch (error) {
            console.error('[OrbitPath] Calculation error:', error);
            callback({ past: [], future: [] });
        }
    }, 0);
}

const SelectedSatelliteExtras: React.FC<SatelliteExtrasProps> = ({
    selectedId,
    objects,
    settings,
    observerPosition,
    selectedSatPos
}) => {
    const { viewer } = useCesium();

    // State for orbit positions (non-blocking)
    const [orbitPositions, setOrbitPositions] = useState<{
        past: Cesium.Cartesian3[];
        future: Cesium.Cartesian3[];
    }>({ past: [], future: [] });

    const [groundTrack, setGroundTrack] = useState<{
        past: Cesium.Cartesian3[];
        future: Cesium.Cartesian3[];
        footprint?: { altitude: number; latitude: number; longitude: number };
    }>({ past: [], future: [] });

    const [ephemerisPath, setEphemerisPath] = useState<Cesium.Cartesian3[]>([]);

    // Find the selected object
    const selectedObj = useMemo(() => {
        if (!selectedId) return null;
        return objects.find(o => o.id === selectedId) || null;
    }, [selectedId, objects]);

    // Non-blocking orbit calculation
    useEffect(() => {
        // Clear state when no selection
        if (!selectedObj?.tle) {
            setOrbitPositions({ past: [], future: [] });
            return;
        }

        console.debug('[OrbitPath] Scheduling async calculation for:', selectedObj.name);

        // Calculate orbit positions asynchronously
        const calcTime = new Date();
        calculateOrbitPositionsAsync(selectedObj.tle, calcTime, (result) => {
            setOrbitPositions(result);
            console.debug('[OrbitPath] Calculation complete:', result.past.length + result.future.length, 'points');
        });
    }, [selectedObj?.id]); // Only recalculate when satellite ID changes

    // Non-blocking ground track calculation
    useEffect(() => {
        if (!selectedObj?.tle || selectedObj.type !== 'TLE') {
            setGroundTrack({ past: [], future: [] });
            return;
        }

        // Defer ground track calculation
        setTimeout(() => {
            try {
                const satrec = satellite.twoline2satrec(selectedObj.tle!.line1, selectedObj.tle!.line2);
                const periodMinutes = (2 * Math.PI) / satrec.no;
                const orbits = settings?.groundTrackOrbits || 1;
                const calcTime = new Date();

                const gt = calculateGroundTrack(
                    selectedObj.tle!.line1,
                    selectedObj.tle!.line2,
                    calcTime,
                    periodMinutes * orbits,
                    periodMinutes * 0.5,
                    60
                );

                setGroundTrack({
                    past: gt.pastTrack.map(p => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, 0)),
                    future: gt.futureTrack.map(p => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, 0)),
                    footprint: gt.currentPosition
                });
            } catch {
                setGroundTrack({ past: [], future: [] });
            }
        }, 50); // Slight delay to prioritize orbit rendering
    }, [selectedObj?.id, settings?.groundTrackOrbits]);

    // Ephemeris path for planets
    useEffect(() => {
        if (!selectedObj || selectedObj.type !== 'EPHEMERIS' || !selectedObj.ephemeris?.positionProperty || !viewer) {
            setEphemerisPath([]);
            return;
        }

        setTimeout(() => {
            const prop = selectedObj.ephemeris!.positionProperty;
            const path: Cesium.Cartesian3[] = [];
            const days = selectedObj.category === 'INTERSTELLAR' ? 30 : 15;
            const nowJulian = viewer.clock.currentTime;

            for (let i = -60; i <= 60; i++) {
                const time = Cesium.JulianDate.addHours(
                    nowJulian,
                    i * (days * 24 / 120),
                    new Cesium.JulianDate()
                );
                const pos = prop.getValue(time);
                if (pos) path.push(pos);
            }

            setEphemerisPath(path);
        }, 0);
    }, [selectedObj?.id, viewer]);

    // Calculate footprint circle
    const footprintPositions = useMemo(() => {
        if (!groundTrack.footprint) return [];

        const { altitude, latitude, longitude } = groundTrack.footprint;
        const radius = calculateFootprintRadius(altitude, 10);
        const circle = generateFootprintCircle(latitude, longitude, radius, 72);

        return circle.map(p => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, 0));
    }, [groundTrack.footprint]);

    // Don't render if no selection
    if (!selectedId) return null;

    return (
        <>
            {/* Future Orbit Path (Yellow - bright) */}
            {orbitPositions.future.length > 0 && settings?.showOrbitPaths !== false && (
                <Entity>
                    <PolylineGraphics
                        positions={orbitPositions.future}
                        width={2}
                        material={FUTURE_ORBIT_COLOR}
                        arcType={Cesium.ArcType.NONE}
                    />
                </Entity>
            )}

            {/* Past Orbit Path (Yellow - faded) */}
            {orbitPositions.past.length > 0 && settings?.showOrbitPaths !== false && (
                <Entity>
                    <PolylineGraphics
                        positions={orbitPositions.past}
                        width={2}
                        material={PAST_ORBIT_COLOR}
                        arcType={Cesium.ArcType.NONE}
                    />
                </Entity>
            )}

            {/* Ephemeris Path (for planets) */}
            {ephemerisPath.length > 0 && settings?.showOrbitPaths !== false && (
                <Entity>
                    <PolylineGraphics
                        positions={ephemerisPath}
                        width={2}
                        material={FUTURE_ORBIT_COLOR}
                    />
                </Entity>
            )}

            {/* Ground Track - Future */}
            {groundTrack.future.length > 0 && settings?.showGroundTrack !== false && (
                <Entity>
                    <PolylineGraphics
                        positions={groundTrack.future}
                        width={2}
                        material={GROUND_TRACK_FUTURE}
                    />
                </Entity>
            )}

            {/* Ground Track - Past (dashed) */}
            {groundTrack.past.length > 0 && settings?.showGroundTrack !== false && (
                <Entity>
                    <PolylineGraphics
                        positions={groundTrack.past}
                        width={2}
                        material={GROUND_TRACK_PAST}
                    />
                </Entity>
            )}

            {/* Footprint Circle */}
            {footprintPositions.length > 0 && settings?.showFootprint !== false && (
                <Entity>
                    <PolylineGraphics
                        positions={footprintPositions}
                        width={1}
                        material={Cesium.Color.CYAN.withAlpha(0.6)}
                    />
                </Entity>
            )}
        </>
    );
};

export default memo(SelectedSatelliteExtras);
