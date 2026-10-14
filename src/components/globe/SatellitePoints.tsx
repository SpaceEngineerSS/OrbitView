"use client";

import { useEffect, useMemo, useRef } from "react";
import * as Cesium from "cesium";
import { useViewer } from "./Globe";
import { useAppStore } from "@/store/appStore";
import { useTelemetryStore } from "@/store/telemetryStore";
import { useTimelineStore } from "@/store/timelineStore";
import { usePerfStore, isLowPower } from "@/store/perfStore";
import { useSatcatStore, matchesCountry } from "@/store/satcatStore";
import { getEngine } from "@/lib/propagation";
import { frameInterval, readPosition } from "@/lib/frameMath";
import { matchesFilter, regimeColor, isStation } from "@/lib/catalog";
import type { SpaceObject } from "@/lib/space-objects";
import { getSatrec, stateAt, lookAngles } from "@/lib/orbit";
import { calculateSunPosition, isSatelliteSunlit } from "@/lib/CoordinateConverter";

const SELECTED = Cesium.Color.WHITE;
const RING = Cesium.Color.fromCssColorString("#6a90ff");
const OUTLINE = Cesium.Color.fromCssColorString("#020306");
const LABEL_BG = Cesium.Color.fromCssColorString("#1b1c20").withAlpha(0.92);
const LABEL_FG = Cesium.Color.fromCssColorString("#f4f5f8");
const LABEL_OFFSET = new Cesium.Cartesian2(10, -10);
const LABEL_PAD = new Cesium.Cartesian2(8, 5);
const NO_SCALE = new Cesium.NearFarScalar(1e6, 1.0, 1e8, 1.0);

/** One colour object per regime instead of one per point. */
const colorCache = new Map<string, Cesium.Color>();
function baseColor(o: SpaceObject): Cesium.Color {
    const key = isStation(o) ? "station" : o.category ?? "LEO";
    let c = colorCache.get(key);
    if (!c) {
        c = Cesium.Color.fromCssColorString(regimeColor(o));
        // The dense LEO/debris cloud is slightly translucent so it doesn't drown the globe.
        if (!isStation(o) && (o.category === "LEO" || o.category === "DEBRIS")) c = c.withAlpha(0.7);
        colorCache.set(key, c);
    }
    return c;
}

/** Stations stand out a little; debris recedes. */
function basePixelSize(o: SpaceObject): number {
    if (isStation(o)) return 6;
    if (o.category === "DEBRIS") return 2;
    if (o.category === "LEO") return 2.5;
    return 3.5;
}

function labelFont(): string {
    const fam = getComputedStyle(document.body).getPropertyValue("--font-ui").trim();
    return `600 13px ${fam || "system-ui"}, sans-serif`;
}

/** Bigger pick box on touch screens, where a fingertip is ~40 px wide. */
const isCoarse = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export default function SatellitePoints() {
    const viewer = useViewer()!;
    const objects = useAppStore((s) => s.objects);
    const filter = useAppStore((s) => s.filter);
    const favorites = useAppStore((s) => s.favorites);
    const country = useAppStore((s) => s.country);
    const owners = useSatcatStore((s) => s.owners);
    const kinds = useSatcatStore((s) => s.kinds);
    const selectedId = useAppStore((s) => s.selectedId);
    const hoveredId = useAppStore((s) => s.hoveredId);
    const pov = useAppStore((s) => s.pov);

    const pointsRef = useRef<Cesium.PointPrimitiveCollection | null>(null);
    const labelsRef = useRef<Cesium.LabelCollection | null>(null);
    const indexRef = useRef<Map<string, number>>(new Map());
    const visibleRef = useRef<Int32Array>(new Int32Array(0));
    const lastPosRef = useRef<Float32Array | null>(null);
    const dirtyRef = useRef(true);
    const scratch = useMemo(() => new Cesium.Cartesian3(), []);

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

    function placeLabels(pos: Float32Array) {
        const labels = labelsRef.current;
        if (!labels) return;
        for (let k = 0; k < labels.length; k++) {
            const l = labels.get(k);
            if (readPosition(pos, indexRef.current.get(l.id as string), scratch)) {
                l.position = scratch;
                l.show = true;
            } else l.show = false;
        }
    }

    function applyPositions(pos: Float32Array) {
        const points = pointsRef.current;
        if (!points) return;
        const list = visibleRef.current;
        const n = points.length;
        for (let k = 0; k < list.length; k++) {
            const i = list[k];
            if (i >= n) continue;
            const p = points.get(i);
            if (readPosition(pos, i, scratch)) {
                p.position = scratch;
                if (!p.show) p.show = true;
            } else if (p.show) p.show = false;
        }
        placeLabels(pos);
    }

    // (Re)build points when the catalog changes. The worker already has it (useAppBoot).
    useEffect(() => {
        const points = pointsRef.current;
        if (!points) return;
        const engine = getEngine();
        points.removeAll();
        indexRef.current = new Map(engine.ids.map((id, i) => [id, i]));
        const byId = useAppStore.getState().byId;
        for (const id of engine.ids) {
            const o = byId.get(id)!;
            points.add({ id, show: false, pixelSize: basePixelSize(o), color: baseColor(o), outlineColor: OUTLINE, outlineWidth: 0, scaleByDistance: NO_SCALE });
        }
        lastPosRef.current = null;
        dirtyRef.current = true;
    }, [objects]);

    // Filter → visible index list, sent to the worker so hidden objects aren't propagated
    useEffect(() => {
        const points = pointsRef.current;
        if (!points) return;
        const favs = new Set(favorites);
        const byId = useAppStore.getState().byId;
        const ids = getEngine().ids;
        const sel = selectedId ? indexRef.current.get(selectedId) ?? -1 : -1;
        const list: number[] = [];
        for (let i = 0; i < ids.length; i++) {
            const o = byId.get(ids[i]);
            const on = i === sel || (!!o && matchesFilter(o, filter, favs, kinds) && matchesCountry(ids[i], country, owners));
            if (on) list.push(i);
            else if (i < points.length && points.get(i).show) points.get(i).show = false;
        }
        visibleRef.current = Int32Array.from(list);
        getEngine().setVisible(visibleRef.current);
        dirtyRef.current = true;
        viewer.scene.requestRender();
    }, [viewer, objects, filter, favorites, country, owners, kinds, selectedId]);

    // Selection / hover styling
    useEffect(() => {
        const points = pointsRef.current;
        if (!points) return;
        const byId = useAppStore.getState().byId;
        const restyle = (id: string | null, on: boolean, kind: "sel" | "hover") => {
            // The collection is destroyed first when the viewer goes away.
            if (!id || points.isDestroyed()) return;
            const i = indexRef.current.get(id);
            if (i === undefined || i >= points.length) return;
            const p = points.get(i);
            const o = byId.get(id)!;
            const base = basePixelSize(o);
            if (on && kind === "sel") {
                // Riding along with the object: its own dot would sit in front of the camera.
                p.pixelSize = pov ? 0 : 11; p.color = SELECTED; p.outlineColor = RING; p.outlineWidth = pov ? 0 : 3;
            } else if (on && kind === "hover") {
                p.pixelSize = Math.max(base, 7); p.outlineColor = OUTLINE; p.outlineWidth = 1.5;
            } else {
                p.pixelSize = base; p.outlineWidth = 0; p.outlineColor = OUTLINE; p.color = baseColor(o);
            }
        };
        restyle(selectedId, true, "sel");
        if (hoveredId !== selectedId) restyle(hoveredId, true, "hover");
        viewer.scene.requestRender();
        return () => {
            restyle(selectedId, false, "sel");
            if (hoveredId !== selectedId) restyle(hoveredId, false, "hover");
        };
    }, [viewer, selectedId, hoveredId, objects, pov]);

    // Labels for the selected and hovered object follow their points
    useEffect(() => {
        const labels = labelsRef.current;
        if (!labels) return;
        labels.removeAll();
        const byId = useAppStore.getState().byId;
        const font = labelFont();
        const add = (id: string | null) => {
            const o = id ? byId.get(id) : undefined;
            if (!o) return;
            labels.add({
                id: o.id, position: Cesium.Cartesian3.ZERO, text: o.name, font, fillColor: LABEL_FG,
                showBackground: true, backgroundColor: LABEL_BG, backgroundPadding: LABEL_PAD, pixelOffset: LABEL_OFFSET,
                horizontalOrigin: Cesium.HorizontalOrigin.LEFT, verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                disableDepthTestDistance: 0, show: false,
            });
        };
        if (!pov) add(selectedId);
        if (hoveredId !== selectedId) add(hoveredId);
        // The last buffer may already be on its way back to the worker
        // (detached, empty); then the labels appear with the next frame.
        if (lastPosRef.current?.length) placeLabels(lastPosRef.current);
        viewer.scene.requestRender();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewer, selectedId, hoveredId, pov]);

    // Frame loop: a timer, not the render loop, so nothing runs while the
    // scene is idle. The interval adapts to speed, zoom and device.
    useEffect(() => {
        const engine = getEngine();
        let lastTime = NaN;
        const off = engine.onFrame((pos, time, computeMs) => {
            lastPosRef.current = pos;
            lastTime = time;
            applyPositions(pos);
            usePerfStore.getState().reportWorker(computeMs);
            if (!viewer.isDestroyed()) viewer.scene.requestRender();
        });

        let timer = 0;
        const tick = () => {
            if (viewer.isDestroyed()) return;
            const { isPlaying, multiplier } = useTimelineStore.getState();
            const height = viewer.camera.positionCartographic.height;
            const interval = frameInterval({ playing: isPlaying, multiplier, cameraHeight: height, lowPower: isLowPower() });
            const now = Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime();
            if (!document.hidden && (dirtyRef.current || (interval > 0 && now !== lastTime))) {
                if (engine.requestFrame(now)) dirtyRef.current = false;
            }
            timer = window.setTimeout(tick, interval || 250);
        };
        tick();

        // A seek while paused must still move the points.
        const unsub = useTimelineStore.subscribe((s, p) => { if (s.seekRequest !== p.seekRequest) dirtyRef.current = true; });
        return () => { off(); window.clearTimeout(timer); unsub(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewer]);

    // Picking
    useEffect(() => {
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        const coarse = isCoarse();
        const box = coarse ? 28 : 10;
        let moving = false;
        const offStart = viewer.camera.moveStart.addEventListener(() => { moving = true; });
        const offEnd = viewer.camera.moveEnd.addEventListener(() => { moving = false; });

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
                if (moving || now - last < 150) return;
                last = now;
                const id = pickId(e.endPosition);
                if (useAppStore.getState().hoveredId !== id) useAppStore.getState().hover(id);
                viewer.canvas.style.cursor = id ? "pointer" : "";
            }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        }

        return () => {
            handler.destroy();
            offStart(); offEnd();
            if (!viewer.isDestroyed()) viewer.canvas.style.cursor = "";
        };
    }, [viewer]);

    // Telemetry for the selected object, once a second (main thread, one
    // object only, so velocity and look angles are exact)
    const selected = useAppStore((s) => (s.selectedId ? s.byId.get(s.selectedId) : undefined));
    const observer = useAppStore((s) => s.observer);
    const follow = useAppStore((s) => s.follow);
    const rec = useMemo(() => (selected?.tle ? getSatrec(selected.tle.line1, selected.tle.line2) : null), [selected]);

    useEffect(() => {
        const setTelemetry = useTelemetryStore.getState().set;
        if (!selected || !rec) { setTelemetry(null); return; }
        setTelemetry(null);
        const tick = () => {
            if (document.hidden) return;
            const date = Cesium.JulianDate.toDate(viewer.clock.currentTime);
            const s = stateAt(rec, date);
            if (!s) { setTelemetry(null); return; }
            const look = observer ? lookAngles(s, observer) : null;
            setTelemetry({
                id: selected.id,
                time: date.getTime(),
                latitude: s.latitudeDeg,
                longitude: s.longitudeDeg,
                altitudeKm: s.altitudeKm,
                speedKmS: s.speedKmS,
                sunlit: isSatelliteSunlit(s.positionEcf, calculateSunPosition(date)),
                look: look && { azimuthDeg: look.azimuthDeg, elevationDeg: look.elevationDeg, rangeKm: look.rangeKm, rangeRateKmS: look.rangeRateKmS },
            });
        };
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [viewer, selected, rec, observer]);

    // Fly to a newly selected object
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

    // Follow: keep the camera on the object every animation frame
    useEffect(() => {
        if (!follow || !rec) return;
        const camera = viewer.camera;
        const offset = new Cesium.HeadingPitchRange(camera.heading, camera.pitch, 3_000_000);
        const target = new Cesium.Cartesian3();
        let raf = 0;
        const step = () => {
            if (viewer.isDestroyed()) return;
            const s = stateAt(rec, Cesium.JulianDate.toDate(viewer.clock.currentTime));
            if (s) {
                target.x = s.positionEcf.x * 1000; target.y = s.positionEcf.y * 1000; target.z = s.positionEcf.z * 1000;
                offset.heading = camera.heading;
                offset.pitch = camera.pitch;
                offset.range = Cesium.Cartesian3.distance(camera.positionWC, target) || offset.range;
                camera.lookAt(target, offset);
                viewer.scene.requestRender();
            }
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => {
            cancelAnimationFrame(raf);
            if (!viewer.isDestroyed()) camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        };
    }, [viewer, follow, rec]);

    return null;
}
