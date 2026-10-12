"use client";

import { useEffect, useMemo } from "react";
import * as Cesium from "cesium";
import { useViewer } from "./Globe";
import { useAppStore, useSelectedObject } from "@/store/appStore";
import { useLowPower } from "@/store/perfStore";
import { getSatrec, stateAt } from "@/lib/orbit";

/**
 * 3D models for the few objects we have one for. Source: NASA 3D Resources
 * (International Space Station (ISS) (B), NASA/Michael D. Carbajal).
 */
export const MODELS: Record<string, { url: string; scale: number; hideNodes?: string[] }> = {
    // File axes: x radial, y along the modules (flight direction), z along the truss.
    // 2.4 m per unit gives the real 109 m truss. The listed nodes are a stray
    // piece that sits 40 units away from the station in this file.
    "25544": {
        url: "/models/iss.glb",
        scale: 2.4,
        hideNodes: ["bendedtru1", "bendedtru2", "bendedtru3", "bendedtrus", "pCylinder1", "pCylinder2", "pCylinder8"],
    },
};

/** File axes → body: x up (away from Earth), y along the velocity, z = x × y. */
function bodyMatrix(p: Cesium.Cartesian3, v: Cesium.Cartesian3, scale: number, out: Cesium.Matrix4): Cesium.Matrix4 {
    const up = Cesium.Cartesian3.normalize(p, new Cesium.Cartesian3());
    const fwd = Cesium.Cartesian3.normalize(v, new Cesium.Cartesian3());
    // Make forward perpendicular to up.
    Cesium.Cartesian3.subtract(fwd, Cesium.Cartesian3.multiplyByScalar(up, Cesium.Cartesian3.dot(fwd, up), new Cesium.Cartesian3()), fwd);
    Cesium.Cartesian3.normalize(fwd, fwd);
    const side = Cesium.Cartesian3.cross(up, fwd, new Cesium.Cartesian3());
    // Columns are where the file's x, y and z axes point.
    const rot = new Cesium.Matrix3(
        up.x * scale, fwd.x * scale, side.x * scale,
        up.y * scale, fwd.y * scale, side.y * scale,
        up.z * scale, fwd.z * scale, side.z * scale,
    );
    return Cesium.Matrix4.fromRotationTranslation(rot, p, out);
}

export default function SatelliteModel() {
    const viewer = useViewer()!;
    const selected = useSelectedObject();
    const pov = useAppStore((s) => s.pov);
    const setPov = useAppStore((s) => s.setPov);
    const lowPower = useLowPower();
    const flat = useAppStore((s) => s.settings.view === "2d");
    const spec = selected ? MODELS[selected.id] : undefined;
    const rec = useMemo(() => (selected?.tle ? getSatrec(selected.tle.line1, selected.tle.line2) : null), [selected]);

    // Model, only for objects that have one, never on the light profile or the flat map
    useEffect(() => {
        if (!spec || !rec || lowPower || flat) return;
        let model: Cesium.Model | null = null;
        let cancelled = false;
        let raf = 0;
        const m = new Cesium.Matrix4();
        const p = new Cesium.Cartesian3(), v = new Cesium.Cartesian3();

        // Treat the file's axes as body axes (x along track, y along the truss,
        // z up) instead of letting Cesium convert glTF's Y-up convention.
        Cesium.Model.fromGltfAsync({
            url: spec.url, minimumPixelSize: 40, maximumScale: 40_000,
            upAxis: Cesium.Axis.Z, forwardAxis: Cesium.Axis.X,
        }).then((loaded) => {
            if (cancelled || viewer.isDestroyed()) { loaded.destroy(); return; }
            model = viewer.scene.primitives.add(loaded) as Cesium.Model;
            const ready = model;
            ready.readyEvent.addEventListener(() => {
                for (const name of spec.hideNodes ?? []) {
                    const node = ready.getNode(name);
                    if (node) node.show = false;
                }
            });
            const step = () => {
                if (viewer.isDestroyed() || !model) return;
                const s = stateAt(rec, Cesium.JulianDate.toDate(viewer.clock.currentTime));
                if (s) {
                    p.x = s.positionEcf.x * 1000; p.y = s.positionEcf.y * 1000; p.z = s.positionEcf.z * 1000;
                    v.x = s.velocityEcf.x; v.y = s.velocityEcf.y; v.z = s.velocityEcf.z;
                    model.modelMatrix = bodyMatrix(p, v, spec.scale, m);
                    // Far away the model is just an icon; only draw it when it's worth seeing.
                    model.show = Cesium.Cartesian3.distance(viewer.camera.positionWC, p) < 3_000_000;
                    // Close up, keep the model moving smoothly between position frames.
                    if (model.show && viewer.clock.shouldAnimate) viewer.scene.requestRender();
                }
                raf = requestAnimationFrame(step);
            };
            raf = requestAnimationFrame(step);
        }).catch(() => { /* no model, the point stays */ });

        return () => {
            cancelled = true;
            cancelAnimationFrame(raf);
            if (model && !viewer.isDestroyed()) viewer.scene.primitives.remove(model);
        };
    }, [viewer, spec, rec, lowPower, flat]);

    // View from the satellite: ride along just behind and above it, looking ahead and down
    useEffect(() => {
        if (!pov || !rec || flat) return;
        const camera = viewer.camera;
        const ctrl = viewer.scene.screenSpaceCameraController;
        const saved = { destination: Cesium.Cartesian3.clone(camera.positionWC), orientation: { heading: camera.heading, pitch: camera.pitch, roll: camera.roll } };
        ctrl.enableInputs = false;
        let raf = 0;
        const step = () => {
            if (viewer.isDestroyed()) return;
            const s = stateAt(rec, Cesium.JulianDate.toDate(viewer.clock.currentTime));
            if (s) {
                const p = new Cesium.Cartesian3(s.positionEcf.x * 1000, s.positionEcf.y * 1000, s.positionEcf.z * 1000);
                const up = Cesium.Cartesian3.normalize(p, new Cesium.Cartesian3());
                const fwd = Cesium.Cartesian3.normalize(new Cesium.Cartesian3(s.velocityEcf.x, s.velocityEcf.y, s.velocityEcf.z), new Cesium.Cartesian3());
                const back = spec ? 190 : 2_000;
                const eye = Cesium.Cartesian3.add(
                    Cesium.Cartesian3.multiplyByScalar(fwd, -back, new Cesium.Cartesian3()),
                    Cesium.Cartesian3.multiplyByScalar(up, back * 0.35, new Cesium.Cartesian3()),
                    new Cesium.Cartesian3());
                Cesium.Cartesian3.add(p, eye, eye);
                // Look ahead, tipped 25° towards the Earth.
                const dir = Cesium.Cartesian3.normalize(Cesium.Cartesian3.add(fwd, Cesium.Cartesian3.multiplyByScalar(up, -0.47, new Cesium.Cartesian3()), new Cesium.Cartesian3()), new Cesium.Cartesian3());
                camera.setView({ destination: eye, orientation: { direction: dir, up } });
                viewer.scene.requestRender();
            }
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => {
            cancelAnimationFrame(raf);
            if (viewer.isDestroyed()) return;
            ctrl.enableInputs = true;
            camera.setView(saved);
        };
    }, [viewer, pov, rec, spec, flat]);

    // Leaving the object (or switching to the map) ends the ride.
    useEffect(() => { if (!selected || flat) setPov(false); }, [selected, flat, setPov]);

    return null;
}
