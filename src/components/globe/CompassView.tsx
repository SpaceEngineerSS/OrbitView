"use client";

import { useEffect } from "react";
import * as Cesium from "cesium";
import { useViewer } from "./Globe";
import { useAppStore } from "@/store/appStore";
import { SensorManager } from "@/lib/SensorManager";

/**
 * Sky view from the observer's position, steered by the phone's compass and
 * tilt sensors. Holding the phone up shows the satellites that are in that
 * part of the sky right now.
 */
export default function CompassView({ onExit }: { onExit?: () => void }) {
    const viewer = useViewer()!;
    const observer = useAppStore((s) => s.observer);

    useEffect(() => {
        if (!observer) { onExit?.(); return; }
        const camera = viewer.camera;
        const saved = {
            destination: Cesium.Cartesian3.clone(camera.positionWC),
            orientation: { heading: camera.heading, pitch: camera.pitch, roll: camera.roll },
        };
        const ctrl = viewer.scene.screenSpaceCameraController;
        ctrl.enableInputs = false;
        const frustum = camera.frustum as Cesium.PerspectiveFrustum;
        const savedFov = frustum.fov;
        frustum.fov = Cesium.Math.toRadians(70);

        const eye = Cesium.Cartesian3.fromDegrees(observer.longitude, observer.latitude, observer.altitude + 2);
        const sensors = SensorManager.getInstance();
        const off = sensors.subscribe(({ alpha, beta }) => {
            if (alpha === null || beta === null) return;
            camera.setView({
                destination: eye,
                orientation: {
                    heading: Cesium.Math.toRadians(alpha),
                    // Phone upright (β = 90°) looks at the horizon; tilting back looks up.
                    pitch: Cesium.Math.toRadians(Math.max(-10, Math.min(90, beta - 90))),
                    roll: 0,
                },
            });
        });
        sensors.start();
        camera.setView({ destination: eye, orientation: { heading: 0, pitch: Cesium.Math.toRadians(20), roll: 0 } });

        return () => {
            off();
            sensors.stop();
            if (viewer.isDestroyed()) return;
            ctrl.enableInputs = true;
            frustum.fov = savedFov;
            camera.setView(saved);
        };
    }, [viewer, observer, onExit]);

    return null;
}
