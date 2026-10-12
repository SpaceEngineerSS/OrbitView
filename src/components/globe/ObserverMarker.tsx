"use client";

import { useEffect } from "react";
import * as Cesium from "cesium";
import { useViewer } from "./Globe";
import { useAppStore } from "@/store/appStore";

const RING = Cesium.Color.WHITE;
const FILL = Cesium.Color.fromCssColorString("#3466f2");

/** A small cross-hair marker at the observer's location. */
export default function ObserverMarker() {
    const viewer = useViewer()!;
    const observer = useAppStore((s) => s.observer);

    useEffect(() => {
        if (!observer) return;
        const pos = Cesium.Cartesian3.fromDegrees(observer.longitude, observer.latitude, observer.altitude);
        const points = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection()) as Cesium.PointPrimitiveCollection;
        points.add({ position: pos, pixelSize: 9, color: FILL, outlineColor: RING, outlineWidth: 2.5 });
        return () => { if (!viewer.isDestroyed()) viewer.scene.primitives.remove(points); };
    }, [viewer, observer]);

    return null;
}
