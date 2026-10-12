"use client";

import { useEffect, useMemo, useRef } from "react";
import * as Cesium from "cesium";
import { useViewer } from "./Globe";
import { useAppStore } from "@/store/appStore";
import { useTelemetryStore } from "@/store/telemetryStore";
import { getEngine } from "@/lib/propagation";
import { matchesFilter, regimeColor } from "@/lib/catalog";
import type { SpaceObject } from "@/lib/space-objects";
import { getSatrec, stateAt, lookAngles } from "@/lib/orbit";
import { calculateSunPosition, isSatelliteSunlit } from "@/lib/CoordinateConverter";

const SELECTED = Cesium.Color.WHITE;
const RING = Cesium.Color.fromCssColorString("#6a90ff");
const OUTLINE = Cesium.Color.fromCssColorString("#020306");
const LABEL_BG = Cesium.Color.fromCssColorString("#1b1c20").withAlpha(0.92);
const LABEL_FG = Cesium.Color.fromCssColorString("#f4f5f8");
const LABEL_OFFSET = new Cesium.Cartesian2(10, -10);
const NO_SCALE = new Cesium.NearFarScalar(1e6, 1.0, 1e8, 1.0);
const FRAME_MS = 50;

function labelFont(): string {
    const fam = getComputedStyle(document.body).getPropertyValue("--font-ui").trim();
    return `600 13px ${fam || "system-ui"}, sans-serif`;
}

/** Regime colour; the dense LEO cloud is slightly translucent so it doesn't drown the globe. */
function baseColor(o: SpaceObject): Cesium.Color {
    const c = Cesium.Color.fromCssColorString(regimeColor(o));
    if (o.group === "station") return c;
    return o.category === "LEO" || o.category === "DEBRIS" ? c.withAlpha(0.7) : c;
}

/** Stations stand out a little; debris recedes. */
function basePixelSize(o: { group?: string; category?: string }): number {
    if (o.group === "station") return 6;
    if (o.category === "DEBRIS") return 2;
    if (o.category === "LEO") return 2.5;
    return 3.5;
}

/** Bigger pick box on touch screens, where a fingertip is ~40 px wide. */
const isCoarse = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export default function SatellitePoints() {
    const viewer = useViewer()!;
    const objects = useAppStore((s) => s.objects);
    const filter = useAppStore((s) => s.filter);
    const favorites = useAppStore((s) => s.favorites);
    const selectedId = useAppStore((s) => s.selectedId);
    const hoveredId = useAppStore((s) => s.hoveredId);

    const pointsRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
    const labelsRef = useRef<Cesium.LabelCollection | null>(null);
    const visibleRef = useRef<Uint8Array>(new Uint8Array(0));
    const indexRef = useRef<Map<string, number>>(new Map());
    const lastPosRef = useRef<Float32Array | null>(null);

    // Collections live as long as the viewer
    useEffect(() => {
        const points = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection()) as Cesium.PointPrimitiveCollection;
        const labels = viewer.scene.primitives.add(new Cesium.LabelCollection()) as Cesium.LabelCollection;
        pointsRef.current = points;
        labelsRef.current = labels;
        return () => {
            if (!viewer.isDestroyed()) {
                viewer.scene.primitives.remove(points);
                viewer.scene.primitives.remove(labels);
            }
            pointsRef.current = null;
            labelsRef.current = null;
        };
    }, [viewer]);

    // (Re)build points when the catalog changes
    useEffect(() => {
        const points = pointsRef.current;
        if (!points) return;
        // The worker already has this catalog (see useAppBoot); mirror its order.
        const engine = getEngine();
        points.removeAll();
        indexRef.current = new Map(engine.ids.map((id, i) => [id, i]));
        const byId = useAppStore.getState().byId;
        for (const id of engine.ids) {
            const o = byId.get(id)!;
            points.add({
                id,
                show: false,
                pixelSize: basePixelSize(o),
                color: baseColor(o),
                outlineColor: OUTLINE,
                outlineWidth: 0,
                scaleByDistance: NO_SCALE,
            });
        }
        lastPosRef.current = null;
    }, [objects]);

    // Filter → visibility mask
    useEffect(() => {
        const favs = new Set(favorites);
        const byId = useAppStore.getState().byId;
        const ids = getEngine().ids;
        const mask = new Uint8Array(ids.length);
        for (let i = 0; i < ids.length; i++) {
            const o = byId.get(ids[i]);
            mask[i] = o && matchesFilter(o, filter, favs) ? 1 : 0;
        }
        visibleRef.current = mask;
        if (lastPosRef.current) applyPositions(lastPosRef.current);
    }, [objects, filter, favorites]);

    const selectedIdRef = useRef(selectedId);
    selectedIdRef.current = selectedId;

    function applyPositions(pos: Float32Array) {
        const points = pointsRef.current;
        if (!points) return;
        const mask = visibleRef.current;
        const sel = selectedIdRef.current;
        const selIdx = sel ? indexRef.current.get(sel) ?? -1 : -1;
        const n = Math.min(points.length, pos.length / 3);
        const scratch = new Cesium.Cartesian3();
        for (let i = 0; i < n; i++) {
            const p = points.get(i);
            const x = pos[i * 3];
            const show = (mask[i] === 1 || i === selIdx) && x === x; // x === x → not NaN
            if (show) {
                scratch.x = x; scratch.y = pos[i * 3 + 1]; scratch.z = pos[i * 3 + 2];
                p.position = scratch;
            }
            if (p.show !== show) p.show = show;
        }
    }

    // Selection / hover styling
    useEffect(() => {
        const points = pointsRef.current;
        if (!points) return;
        const byId = useAppStore.getState().byId;
        const restyle = (id: string | null, on: boolean, kind: "sel" | "hover") => {
            // The collection is destroyed first when the viewer goes away.
            if (!id || points.isDestroyed()) return;
            const i = indexRef.current.get(id);
            if (i === undefined) return;
            const p = points.get(i);
            const o = byId.get(id)!;
            const base = basePixelSize(o);
            if (on && kind === "sel") {
                p.pixelSize = 11; p.color = SELECTED; p.outlineColor = RING; p.outlineWidth = 3;
            } else if (on && kind === "hover") {
                p.pixelSize = Math.max(base, 7); p.outlineColor = OUTLINE; p.outlineWidth = 1.5;
            } else {
                p.pixelSize = base; p.outlineWidth = 0; p.outlineColor = OUTLINE; p.color = baseColor(o);
            }
        };
        restyle(selectedId, true, "sel");
        if (hoveredId !== selectedId) restyle(hoveredId, true, "hover");
        return () => {
            restyle(selectedId, false, "sel");
            if (hoveredId !== selectedId) restyle(hoveredId, false, "hover");
        };
    }, [selectedId, hoveredId, objects]);

    // Labels for the selected and hovered object follow their points
    useEffect(() => {
        const labels = labelsRef.current;
        if (!labels) return;
        labels.removeAll();
        const byId = useAppStore.getState().byId;
        const font = labelFont();
        const add = (id: string | null) => {
            if (!id) return;
            const o = byId.get(id);
            if (!o) return;
            labels.add({
                id,
                position: Cesium.Cartesian3.ZERO,
                text: o.name,
                font,
                fillColor: LABEL_FG,
                showBackground: true,
                backgroundColor: LABEL_BG,
                backgroundPadding: new Cesium.Cartesian2(8, 5),
                pixelOffset: LABEL_OFFSET,
                horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                disableDepthTestDistance: 0,
                show: false,
            });
        };
        add(selectedId);
        if (hoveredId !== selectedId) add(hoveredId);
    }, [selectedId, hoveredId]);

    // Frame loop: ask the worker for positions at the current sim time
    useEffect(() => {
        const engine = getEngine();
        const off = engine.onFrame((pos) => {
            lastPosRef.current = pos;
            applyPositions(pos);
            const labels = labelsRef.current;
            if (labels) {
                for (let k = 0; k < labels.length; k++) {
                    const l = labels.get(k);
                    const i = indexRef.current.get(l.id as string);
                    const x = i === undefined ? NaN : pos[i * 3];
                    if (x === x) {
                        l.position = new Cesium.Cartesian3(x, pos[i! * 3 + 1], pos[i! * 3 + 2]);
                        l.show = true;
                    } else l.show = false;
                }
            }
        });
        let last = 0;
        const remove = viewer.scene.preRender.addEventListener((_s, time) => {
            const now = performance.now();
            if (now - last < FRAME_MS) return;
            last = now;
            engine.requestFrame(Cesium.JulianDate.toDate(time).getTime());
        });
        return () => { off(); remove(); };
    }, [viewer]);

    // Picking
    useEffect(() => {
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        const coarse = isCoarse();
        const box = coarse ? 28 : 10;

        const pickId = (pos: Cesium.Cartesian2): string | null => {
            const picked = viewer.scene.pick(pos, box, box);
            if (picked && picked.collection === pointsRef.current && typeof picked.id === "string") return picked.id;
            return null;
        };

        handler.setInputAction((e: { position: Cesium.Cartesian2 }) => {
            const id = pickId(e.position);
            if (id) useAppStore.getState().select(id);
            // On touch screens a missed tap shouldn't throw away the selection.
            else if (!coarse) useAppStore.getState().select(null);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        if (!coarse) {
            let last = 0;
            handler.setInputAction((e: { endPosition: Cesium.Cartesian2 }) => {
                const now = performance.now();
                if (now - last < 60) return;
                last = now;
                const id = pickId(e.endPosition);
                if (useAppStore.getState().hoveredId !== id) useAppStore.getState().hover(id);
                viewer.canvas.style.cursor = id ? "pointer" : "";
            }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        }

        return () => {
            handler.destroy();
            if (!viewer.isDestroyed()) viewer.canvas.style.cursor = "";
        };
    }, [viewer]);

    // Telemetry for the selected object, once a second (computed here on the
    // main thread for one object only, so velocity and look angles are exact)
    const selected = useAppStore((s) => (s.selectedId ? s.byId.get(s.selectedId) : undefined));
    const observer = useAppStore((s) => s.observer);
    const follow = useAppStore((s) => s.follow);
    const rec = useMemo(() => (selected?.tle ? getSatrec(selected.tle.line1, selected.tle.line2) : null), [selected]);

    useEffect(() => {
        const setTelemetry = useTelemetryStore.getState().set;
        if (!selected || !rec) { setTelemetry(null); return; }
        setTelemetry(null);
        const tick = () => {
            const date = Cesium.JulianDate.toDate(viewer.clock.currentTime);
            const s = stateAt(rec, date);
            if (!s) { setTelemetry(null); return; }
            setTelemetry({
                id: selected.id,
                time: date.getTime(),
                latitude: s.latitudeDeg,
                longitude: s.longitudeDeg,
                altitudeKm: s.altitudeKm,
                speedKmS: s.speedKmS,
                sunlit: isSatelliteSunlit(s.positionEcf, calculateSunPosition(date)),
                look: observer ? (({ azimuthDeg, elevationDeg, rangeKm, rangeRateKmS }) =>
                    ({ azimuthDeg, elevationDeg, rangeKm, rangeRateKmS }))(lookAngles(s, observer)) : null,
            });
        };
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [viewer, selected, rec, observer]);

    // Fly to a newly selected object, and optionally keep following it
    useEffect(() => {
        if (!selected || !rec) return;
        const s = stateAt(rec, Cesium.JulianDate.toDate(viewer.clock.currentTime));
        if (!s) return;
        const range = Math.max(7_000_000, s.altitudeKm * 1000 * 2.2);
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(s.longitudeDeg, s.latitudeDeg, s.altitudeKm * 1000 + range),
            duration: 1.2,
        });
    }, [viewer, selected, rec]);

    useEffect(() => {
        if (!follow || !rec) return;
        const camera = viewer.camera;
        const offset = new Cesium.HeadingPitchRange(camera.heading, -Math.PI / 2 + 0.35, 3_000_000);
        const remove = viewer.scene.preRender.addEventListener((_s, time) => {
            const s = stateAt(rec, Cesium.JulianDate.toDate(time));
            if (!s) return;
            const p = new Cesium.Cartesian3(s.positionEcf.x * 1000, s.positionEcf.y * 1000, s.positionEcf.z * 1000);
            offset.heading = camera.heading;
            offset.pitch = camera.pitch;
            offset.range = Cesium.Cartesian3.distance(camera.positionWC, p) || offset.range;
            camera.lookAt(p, offset);
        });
        return () => {
            remove();
            if (!viewer.isDestroyed()) camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        };
    }, [viewer, follow, rec]);

    return null;
}
