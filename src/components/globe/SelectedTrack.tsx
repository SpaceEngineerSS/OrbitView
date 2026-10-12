"use client";

import { useEffect, useMemo } from "react";
import * as Cesium from "cesium";
import * as satellite from "satellite.js";
import { useViewer } from "./Globe";
import { useAppStore, useSelectedObject } from "@/store/appStore";
import { getSatrec, stateAt, elementsFromSatrec } from "@/lib/orbit";
import { calculateFootprintRadius, generateFootprintCircle } from "@/lib/GroundTrack";

const ORBIT = Cesium.Color.fromCssColorString("#8fb0ff").withAlpha(0.95);
const TRACK_AHEAD = Cesium.Color.WHITE.withAlpha(0.7);
const TRACK_BEHIND = Cesium.Color.WHITE.withAlpha(0.3);
const FOOTPRINT = Cesium.Color.fromCssColorString("#ffc94d").withAlpha(0.75);
const LIFT_M = 6_000; // keep surface lines above the ellipsoid so chords don't sink
const TICK_MS = 250;

/**
 * Orbit ring, ground track and coverage circle of the selected object, all
 * on the simulation clock.
 *
 * The ring is one revolution of TEME positions, computed once and turned with
 * the Earth through the collection's model matrix (a rotation by −GMST), so it
 * isn't re-tessellated every frame. It's recomputed only every 15 minutes of
 * simulation time, to pick up slow perturbations like nodal precession.
 */
export default function SelectedTrack() {
    const viewer = useViewer()!;
    const selected = useSelectedObject();
    const showOrbit = useAppStore((s) => s.settings.showOrbit);
    const showTrack = useAppStore((s) => s.settings.showGroundTrack);
    const showFootprint = useAppStore((s) => s.settings.showFootprint);
    const minEl = useAppStore((s) => s.settings.minElevation);
    const orbits = useAppStore((s) => s.settings.trackOrbits);
    const flat = useAppStore((s) => s.settings.view === "2d");
    // Riding along with the object, its own orbit line would cut through the view.
    const pov = useAppStore((s) => s.pov);

    const rec = useMemo(() => (selected?.tle ? getSatrec(selected.tle.line1, selected.tle.line2) : null), [selected]);

    useEffect(() => {
        if (!rec) return;
        const ringLines = viewer.scene.primitives.add(new Cesium.PolylineCollection()) as Cesium.PolylineCollection;
        const groundLines = viewer.scene.primitives.add(new Cesium.PolylineCollection()) as Cesium.PolylineCollection;
        const mat = (c: Cesium.Color) => Cesium.Material.fromType("Color", { color: c });
        const ring = ringLines.add({ width: 2, material: mat(ORBIT), show: false });
        const ahead = groundLines.add({ width: 1.5, material: mat(TRACK_AHEAD), show: false });
        const behind = groundLines.add({ width: 1, material: mat(TRACK_BEHIND), show: false });
        const foot = groundLines.add({ width: 1.5, material: mat(FOOTPRINT), show: false });

        const periodMs = elementsFromSatrec(rec).periodMin * 60_000;
        const rot = new Cesium.Matrix3();
        let ringAt = -Infinity, trackAt = -Infinity, trackWall = -Infinity, footWall = -Infinity;
        let lastT = NaN, ringAngle = NaN;

        const ground = (t: number) => {
            const s = stateAt(rec, new Date(t));
            return s ? Cesium.Cartesian3.fromDegrees(s.longitudeDeg, s.latitudeDeg, LIFT_M) : null;
        };

        const update = () => {
            if (viewer.isDestroyed() || document.hidden) return;
            const t = Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime();
            if (t === lastT) return; // paused: nothing moves, nothing to redraw
            lastT = t;
            const wall = performance.now();
            let changed = false;

            // Ring: TEME positions once, rotated with the Earth each tick
            if (showOrbit && !flat && !pov) {
                if (Math.abs(t - ringAt) > 15 * 60_000) {
                    ringAt = t;
                    const pts: Cesium.Cartesian3[] = [];
                    for (let i = 0; i <= 240; i++) {
                        const st = stateAt(rec, new Date(t + (periodMs * i) / 240));
                        if (st) pts.push(new Cesium.Cartesian3(st.positionEci.x * 1000, st.positionEci.y * 1000, st.positionEci.z * 1000));
                    }
                    if (pts.length > 1) { ring.positions = pts; changed = true; }
                }
                // Turn with the Earth, but only redraw once it has moved visibly (~0.01°).
                const angle = satellite.gstime(new Date(t));
                if (!(Math.abs(angle - ringAngle) < 1.7e-4)) {
                    ringAngle = angle;
                    Cesium.Matrix3.fromRotationZ(-angle, rot);
                    ringLines.modelMatrix = Cesium.Matrix4.fromRotationTranslation(rot, Cesium.Cartesian3.ZERO, ringLines.modelMatrix);
                    changed = true;
                }
                if (!ring.show && ring.positions.length > 1) { ring.show = true; changed = true; }
            } else if (ring.show) {
                ring.show = false;
                changed = true;
            }

            // Ground track: every 30 s of sim time, but not more than twice a second
            if (showTrack && Math.abs(t - trackAt) > 30_000 && wall - trackWall > 500) {
                trackAt = t;
                trackWall = wall;
                const step = Math.max(20_000, periodMs / 300);
                const fwd: Cesium.Cartesian3[] = [];
                const back: Cesium.Cartesian3[] = [];
                for (let dt = 0; dt <= periodMs * orbits; dt += step) { const p = ground(t + dt); if (p) fwd.push(p); }
                for (let dt = 0; dt <= periodMs / 2; dt += step) { const p = ground(t - dt); if (p) back.push(p); }
                ahead.positions = fwd;
                behind.positions = back;
                changed = true;
            }
            const trackOn = showTrack && ahead.positions.length > 1;
            if (ahead.show !== trackOn) { ahead.show = behind.show = trackOn; changed = true; }

            // Coverage circle: once a second
            if (showFootprint && wall - footWall > 1000) {
                footWall = wall;
                const s = stateAt(rec, new Date(t));
                if (s) {
                    const r = calculateFootprintRadius(s.altitudeKm, minEl);
                    foot.positions = generateFootprintCircle(s.latitudeDeg, s.longitudeDeg, r, 96)
                        .map((p) => Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, LIFT_M));
                    changed = true;
                }
            }
            const footOn = showFootprint && foot.positions.length > 1;
            if (foot.show !== footOn) { foot.show = footOn; changed = true; }

            if (changed) viewer.scene.requestRender();
        };

        update();
        const id = window.setInterval(update, TICK_MS);
        return () => {
            window.clearInterval(id);
            if (!viewer.isDestroyed()) {
                viewer.scene.primitives.remove(ringLines);
                viewer.scene.primitives.remove(groundLines);
            }
        };
    }, [viewer, rec, showOrbit, showTrack, showFootprint, minEl, orbits, flat, pov]);

    return null;
}
