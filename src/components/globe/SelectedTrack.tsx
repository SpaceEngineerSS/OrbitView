"use client";

import { useEffect, useMemo } from "react";
import * as Cesium from "cesium";
import { useViewer } from "./Globe";
import { useAppStore, useSelectedObject } from "@/store/appStore";
import { getSatrec, stateAt, elementsFromSatrec } from "@/lib/orbit";
import { orbitRingEcf, calculateFootprintRadius, generateFootprintCircle } from "@/lib/GroundTrack";

const ORBIT = Cesium.Color.fromCssColorString("#f2a33a").withAlpha(0.85);
const TRACK_AHEAD = Cesium.Color.fromCssColorString("#e8e4da").withAlpha(0.55);
const TRACK_BEHIND = Cesium.Color.fromCssColorString("#8d9097").withAlpha(0.35);
const FOOTPRINT = Cesium.Color.fromCssColorString("#f2a33a").withAlpha(0.45);
const LIFT_M = 6_000; // keep surface lines above the ellipsoid so chords don't sink

const toCart = (v: { x: number; y: number; z: number }) => new Cesium.Cartesian3(v.x * 1000, v.y * 1000, v.z * 1000);

/**
 * Orbit ring, ground track and coverage circle of the selected object.
 * All three follow the simulation clock, not wall time:
 *  - ring: rebuilt when the Earth has turned enough to move it (~2 s sim)
 *  - ground track: rebuilt every 30 s of sim time or on a jump
 *  - footprint: every second (wall)
 */
export default function SelectedTrack() {
    const viewer = useViewer()!;
    const selected = useSelectedObject();
    const showOrbit = useAppStore((s) => s.settings.showOrbit);
    const showTrack = useAppStore((s) => s.settings.showGroundTrack);
    const showFootprint = useAppStore((s) => s.settings.showFootprint);
    const minEl = useAppStore((s) => s.settings.minElevation);

    const rec = useMemo(() => (selected?.tle ? getSatrec(selected.tle.line1, selected.tle.line2) : null), [selected]);

    useEffect(() => {
        if (!rec) return;
        const lines = viewer.scene.primitives.add(new Cesium.PolylineCollection()) as Cesium.PolylineCollection;
        const ring = lines.add({ width: 1.5, material: Cesium.Material.fromType("Color", { color: ORBIT }), show: false });
        const ahead = lines.add({ width: 1, material: Cesium.Material.fromType("Color", { color: TRACK_AHEAD }), show: false });
        const behind = lines.add({ width: 1, material: Cesium.Material.fromType("Color", { color: TRACK_BEHIND }), show: false });
        const foot = lines.add({ width: 1, material: Cesium.Material.fromType("Color", { color: FOOTPRINT }), show: false });

        const periodMs = elementsFromSatrec(rec).periodMin * 60_000;
        // GEO rings hardly change; LEO rings need refreshing as the Earth turns.
        let ringAt = -Infinity, trackAt = -Infinity, footAt = -Infinity;

        const ground = (t: number) => {
            const s = stateAt(rec, new Date(t));
            return s ? Cesium.Cartesian3.fromDegrees(s.longitudeDeg, s.latitudeDeg, LIFT_M) : null;
        };

        const update = (date: Date) => {
            const t = date.getTime();
            const wall = performance.now();

            if (showOrbit && Math.abs(t - ringAt) > 2000) {
                ringAt = t;
                const pts = orbitRingEcf(rec, date, 240).map(toCart);
                if (pts.length > 1) { ring.positions = pts; ring.show = true; }
            }
            ring.show = showOrbit && ring.positions.length > 1;

            if (showTrack && Math.abs(t - trackAt) > 30_000) {
                trackAt = t;
                const step = Math.max(20_000, periodMs / 300);
                const fwd: Cesium.Cartesian3[] = [];
                const back: Cesium.Cartesian3[] = [];
                for (let dt = 0; dt <= periodMs; dt += step) { const p = ground(t + dt); if (p) fwd.push(p); }
                for (let dt = 0; dt <= periodMs / 2; dt += step) { const p = ground(t - dt); if (p) back.push(p); }
                ahead.positions = fwd; behind.positions = back;
            }
            ahead.show = behind.show = showTrack && ahead.positions.length > 1;

            if (showFootprint && wall - footAt > 1000) {
                footAt = wall;
                const s = stateAt(rec, date);
                if (s) {
                    const r = calculateFootprintRadius(s.altitudeKm, minEl);
                    foot.positions = generateFootprintCircle(s.latitudeDeg, s.longitudeDeg, r, 96)
                        .map((p) => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, LIFT_M));
                }
            }
            foot.show = showFootprint && foot.positions.length > 1;
        };

        update(Cesium.JulianDate.toDate(viewer.clock.currentTime));
        const remove = viewer.scene.preRender.addEventListener((_s, time) => update(Cesium.JulianDate.toDate(time)));
        return () => {
            remove();
            if (!viewer.isDestroyed()) viewer.scene.primitives.remove(lines);
        };
    }, [viewer, rec, showOrbit, showTrack, showFootprint, minEl]);

    return null;
}
