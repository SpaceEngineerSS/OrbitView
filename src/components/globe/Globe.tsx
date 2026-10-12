"use client";

/**
 * The 3D globe. Owns one Cesium.Viewer for its lifetime and hands it to the
 * layers below through context. Everything Cesium-side is imperative; React
 * only decides which layers exist.
 */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { useAppStore } from "@/store/appStore";
import { useTimelineStore } from "@/store/timelineStore";
import { usePerfStore, useLowPower } from "@/store/perfStore";
import SatellitePoints from "./SatellitePoints";
import SelectedTrack from "./SelectedTrack";
import ObserverMarker from "./ObserverMarker";
import CompassView from "./CompassView";
import SatelliteModel from "./SatelliteModel";

if (typeof window !== "undefined") {
    (window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = "/cesium";
    if (process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
        Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
    }
}

const ViewerContext = createContext<Cesium.Viewer | null>(null);
export const useViewer = () => useContext(ViewerContext);

const BASEMAPS = {
    dark: {
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        credit: "Esri, HERE, Garmin, © OpenStreetMap contributors",
        maximumLevel: 16,
    },
    imagery: {
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        credit: "Esri, Maxar, Earthstar Geographics",
        maximumLevel: 19,
    },
} as const;

const BACKGROUND = Cesium.Color.fromCssColorString("#020306");
const GLOBE_BASE = Cesium.Color.fromCssColorString("#0d1b2a");

interface GlobeProps {
    compass?: boolean;
    onCompassExit?: () => void;
}

export default function Globe({ compass = false, onCompassExit }: GlobeProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);

    // Create / destroy the viewer
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const v = new Cesium.Viewer(el, {
            baseLayer: false,
            animation: false,
            timeline: false,
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            selectionIndicator: false,
            infoBox: false,
            fullscreenButton: false,
            creditContainer: document.createElement("div"),
            // Don't wake a laptop's discrete GPU for a globe and some points.
            contextOptions: { webgl: { powerPreference: "default" } },
            // Draw only when something changed; layers call requestRender().
            requestRenderMode: true,
            maximumRenderTimeChange: Infinity,
        });

        const scene = v.scene;
        scene.backgroundColor = BACKGROUND;
        scene.globe.baseColor = GLOBE_BASE;
        // Photographic look: thin atmosphere at the limb and over the ground, stars behind.
        scene.globe.showGroundAtmosphere = true;
        if (scene.skyAtmosphere) scene.skyAtmosphere.show = true;
        scene.globe.atmosphereLightIntensity = 12;
        scene.fog.enabled = false;
        if (scene.sun) scene.sun.show = false;
        if (scene.moon) scene.moon.show = false;
        scene.highDynamicRange = false;
        scene.postProcessStages.fxaa.enabled = true;
        scene.screenSpaceCameraController.minimumZoomDistance = 50_000;
        scene.screenSpaceCameraController.maximumZoomDistance = 2.5e8;

        v.clock.clockRange = Cesium.ClockRange.UNBOUNDED;
        v.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        v.clock.currentTime = Cesium.JulianDate.fromDate(useTimelineStore.getState().currentTime);

        const obs = useAppStore.getState().observer;
        v.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(obs?.longitude ?? 30, obs?.latitude ?? 25, 22_000_000),
        });

        // Measure real render cost so slow devices drop to the light profile.
        // Frames while map tiles are still streaming in are much slower than
        // steady state, so skip the first seconds and any frame with tiles pending.
        let renderStart = 0;
        const measureFrom = performance.now() + 5000;
        const offPre = scene.preRender.addEventListener(() => { renderStart = performance.now(); });
        const offPost = scene.postRender.addEventListener(() => {
            if (renderStart > measureFrom && scene.globe.tilesLoaded) usePerfStore.getState().reportRender(performance.now() - renderStart);
        });

        // Development only: lets the console and profiling scripts reach the viewer.
        if (process.env.NODE_ENV !== "production") (window as unknown as { __orbitview?: unknown }).__orbitview = { viewer: v };

        setViewer(v);
        return () => {
            offPre(); offPost();
            setViewer(null);
            if (!v.isDestroyed()) v.destroy();
        };
    }, []);

    // Light profile for slow devices / battery saver
    const lowPower = useLowPower();
    const nightShadowSetting = useAppStore((s) => s.settings.showNightShadow);
    useEffect(() => {
        if (!viewer) return;
        const scene = viewer.scene;
        scene.msaaSamples = lowPower ? 1 : 4;
        viewer.resolutionScale = lowPower ? 0.8 : 1;
        scene.globe.maximumScreenSpaceError = lowPower ? 4 : 2;
        scene.globe.tileCacheSize = lowPower ? 50 : 100;
        scene.globe.showGroundAtmosphere = !lowPower;
        scene.globe.enableLighting = nightShadowSetting && !lowPower;
        scene.requestRender();
    }, [viewer, lowPower, nightShadowSetting]);

    // Globe or flat map
    const view = useAppStore((s) => s.settings.view);
    useEffect(() => {
        if (!viewer) return;
        const scene = viewer.scene;
        if (view === "2d" && scene.mode !== Cesium.SceneMode.SCENE2D) scene.morphTo2D(0.8);
        if (view === "3d" && scene.mode !== Cesium.SceneMode.SCENE3D) scene.morphTo3D(0.8);
    }, [viewer, view]);

    // Basemap
    const basemap = useAppStore((s) => s.settings.basemap);
    useEffect(() => {
        if (!viewer) return;
        const cfg = BASEMAPS[basemap];
        const layers = viewer.imageryLayers;
        layers.removeAll();
        layers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
            url: cfg.url,
            credit: cfg.credit,
            maximumLevel: cfg.maximumLevel,
        }));
        viewer.scene.requestRender();
    }, [viewer, basemap]);

    // Clock: Cesium → store, a few times per second
    const syncFromCesium = useTimelineStore((s) => s.syncFromCesium);
    useEffect(() => {
        if (!viewer) return;
        let last = 0;
        return viewer.clock.onTick.addEventListener((clock) => {
            const now = performance.now();
            if (now - last < 250) return;
            last = now;
            syncFromCesium(Cesium.JulianDate.toDate(clock.currentTime));
        });
    }, [viewer, syncFromCesium]);

    // Clock: user actions → Cesium
    const isPlaying = useTimelineStore((s) => s.isPlaying);
    const multiplier = useTimelineStore((s) => s.multiplier);
    const seekRequest = useTimelineStore((s) => s.seekRequest);
    useEffect(() => {
        if (!viewer) return;
        viewer.clock.shouldAnimate = isPlaying;
        viewer.clock.multiplier = multiplier;
    }, [viewer, isPlaying, multiplier]);
    useEffect(() => {
        if (!viewer || seekRequest.seq === 0) return;
        viewer.clock.currentTime = Cesium.JulianDate.fromDate(seekRequest.time);
        viewer.scene.requestRender();
    }, [viewer, seekRequest]);

    // Gentle auto-rotation, suspended for 15 s after any interaction.
    // Off on the light profile: it forces a render every frame.
    const autoRotate = useAppStore((s) => s.settings.autoRotate);
    const hasSelection = useAppStore((s) => s.selectedId !== null);
    useEffect(() => {
        if (!viewer || !autoRotate || hasSelection || compass || lowPower || view === "2d") return;
        let lastInput = 0;
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        const touch = () => { lastInput = performance.now(); };
        handler.setInputAction(touch, Cesium.ScreenSpaceEventType.LEFT_DOWN);
        handler.setInputAction(touch, Cesium.ScreenSpaceEventType.WHEEL);
        handler.setInputAction(touch, Cesium.ScreenSpaceEventType.PINCH_START);
        let raf = 0;
        const step = () => {
            if (viewer.isDestroyed()) return;
            if (!document.hidden && performance.now() - lastInput > 15_000) {
                viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.0004);
                viewer.scene.requestRender();
            }
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => { cancelAnimationFrame(raf); handler.destroy(); };
    }, [viewer, autoRotate, hasSelection, compass, lowPower, view]);

    return (
        <ViewerContext.Provider value={viewer}>
            <div ref={containerRef} className="absolute inset-0" />
            {viewer && (
                <>
                    <SatellitePoints />
                    <SelectedTrack />
                    <ObserverMarker />
                    <SatelliteModel />
                    {compass && <CompassView onExit={onCompassExit} />}
                </>
            )}
        </ViewerContext.Provider>
    );
}
