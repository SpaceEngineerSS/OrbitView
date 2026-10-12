"use client";

import { useEffect } from "react";
import * as Cesium from "cesium";
import { useViewer } from "./Globe";
import { useAppStore } from "@/store/appStore";

const BONE = Cesium.Color.fromCssColorString("#e8e4da");
const INK = Cesium.Color.fromCssColorString("#101215");

/** A small cross-hair marker at the observer's location. */
export default function ObserverMarker() {
    const viewer = useViewer()!;
    const observer = useAppStore((s) => s.observer);

    useEffect(() => {
        if (!observer) return;
        const pos = Cesium.Cartesian3.fromDegrees(observer.longitude, observer.latitude, observer.altitude);
        const points = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection()) as Cesium.PointPrimitiveCollection;
        points.add({ position: pos, pixelSize: 7, color: INK, outlineColor: BONE, outlineWidth: 2 });
        return () => { if (!viewer.isDestroyed()) viewer.scene.primitives.remove(points); };
    }, [viewer, observer]);

    return null;
}
