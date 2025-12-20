"use client";

import React, { useState, useEffect, memo } from "react";
import { Entity, PolylineGraphics, useCesium } from "resium";
import * as Cesium from "cesium";
import * as satellite from "satellite.js";
import { SpaceObject } from "@/lib/space-objects";
import { calculateGroundTrack, calculateFootprintRadius, generateFootprintCircle } from "@/lib/GroundTrack";

const ORBIT_COLOR = Cesium.Color.ORANGE.withAlpha(0.8);
const TRAJECTORY_COLOR = Cesium.Color.WHITE.withAlpha(0.6);

interface SatelliteExtrasProps {
    selectedId?: string;
    objects: SpaceObject[];
    settings: any;
    observerPosition?: any;
    selectedSatPos: Cesium.Cartesian3 | null;
}

const SelectedSatelliteExtras: React.FC<SatelliteExtrasProps> = ({
    selectedId,
    objects,
    settings,
    observerPosition,
    selectedSatPos
}) => {
    const { viewer } = useCesium();
    const [orbitPath, setOrbitPath] = useState<Cesium.Cartesian3[]>([]);
    const [trajectoryPath, setTrajectoryPath] = useState<Cesium.Cartesian3[]>([]);
    const [groundTrackPast, setGroundTrackPast] = useState<Cesium.Cartesian3[]>([]);
    const [groundTrackFuture, setGroundTrackFuture] = useState<Cesium.Cartesian3[]>([]);
    const [footprintPositions, setFootprintPositions] = useState<Cesium.Cartesian3[]>([]);

    useEffect(() => {
        if (!selectedId || !viewer || !viewer.clock) {
            setOrbitPath([]);
            setTrajectoryPath([]);
            setGroundTrackPast([]);
            setGroundTrackFuture([]);
            setFootprintPositions([]);
            return;
        }

        const selectedObj = objects.find(o => o.id === selectedId);
        if (!selectedObj) return;

        // Orbit Calculation
        const now = Cesium.JulianDate.toDate(viewer.clock.currentTime);
        if (selectedObj.type === 'TLE' && selectedObj.tle) {
            const rec = satellite.twoline2satrec(selectedObj.tle.line1, selectedObj.tle.line2);
            const meanMotion = rec.no;
            const period = (2 * Math.PI) / meanMotion;
            const path: Cesium.Cartesian3[] = [];
            const gmst = satellite.gstime(now);

            for (let i = -period / 2; i <= period / 2; i += period / 180) {
                const time = new Date(now.getTime() + i * 60000);
                const posVel = satellite.propagate(rec, time);
                if (posVel?.position && typeof posVel.position !== 'boolean') {
                    const ecf = satellite.eciToEcf(posVel.position as any, gmst);
                    path.push(new Cesium.Cartesian3(ecf.x * 1000, ecf.y * 1000, ecf.z * 1000));
                }
            }
            setOrbitPath(path);

            // Ground Track
            const gt = calculateGroundTrack(selectedObj.tle.line1, selectedObj.tle.line2, now, period * (settings?.groundTrackOrbits || 1), period * 0.5, 60);
            setGroundTrackPast(gt.pastTrack.map(p => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, 0)));
            setGroundTrackFuture(gt.futureTrack.map(p => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, 0)));

            const radius = calculateFootprintRadius(gt.currentPosition.altitude, 10);
            const footprint = generateFootprintCircle(gt.currentPosition.latitude, gt.currentPosition.longitude, radius, 72);
            setFootprintPositions(footprint.map(p => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, 0)));

        } else if (selectedObj.type === 'EPHEMERIS' && selectedObj.ephemeris?.positionProperty) {
            const prop = selectedObj.ephemeris.positionProperty;
            const oPath: Cesium.Cartesian3[] = [];
            const days = (selectedObj.category === 'INTERSTELLAR') ? 30 : 15;
            for (let i = -60; i <= 60; i++) {
                const time = Cesium.JulianDate.addHours(viewer.clock.currentTime, i * (days * 24 / 120), new Cesium.JulianDate());
                const pos = prop.getValue(time);
                if (pos) oPath.push(pos);
            }
            setOrbitPath(oPath);
        }

    }, [selectedId, objects, settings, viewer?.clock?.currentTime]);

    return (
        <>
            {orbitPath.length > 0 && settings?.showOrbitPaths !== false && (
                <Entity>
                    <PolylineGraphics positions={orbitPath} width={2} material={ORBIT_COLOR} />
                </Entity>
            )}
            {groundTrackFuture.length > 0 && settings?.showGroundTrack !== false && (
                <Entity>
                    <PolylineGraphics positions={groundTrackFuture} width={2} material={Cesium.Color.CYAN.withAlpha(0.8)} />
                    <PolylineGraphics positions={groundTrackPast} width={2} material={new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.RED.withAlpha(0.7) })} />
                </Entity>
            )}
            {footprintPositions.length > 0 && settings?.showFootprint !== false && (
                <Entity>
                    <PolylineGraphics positions={footprintPositions} width={1} material={Cesium.Color.CYAN.withAlpha(0.6)} />
                </Entity>
            )}
        </>
    );
};

export default memo(SelectedSatelliteExtras);
