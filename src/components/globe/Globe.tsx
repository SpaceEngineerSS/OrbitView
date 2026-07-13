"use client";

import React, { useEffect, useState, useRef, useMemo, memo } from "react";
import { Viewer, Scene } from "resium";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

// Use ArcGIS World Imagery (Satellite) - high quality, no API token required
const satelliteImageryProvider = new Cesium.UrlTemplateImageryProvider({
  url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  credit: "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
});
const defaultBaseLayer = new Cesium.ImageryLayer(satelliteImageryProvider);
const defaultTerrainProvider = new Cesium.EllipsoidTerrainProvider();
import SatelliteLayer from "./SatelliteLayer";
import { SpaceObject } from "@/lib/space-objects";
import * as satellite from "satellite.js";
import { Compass, Smartphone } from "lucide-react";
import { SensorManager } from "@/lib/SensorManager";
import { AppSettings } from "@/components/hud/SettingsPanel";
import { useTimelineStore } from "@/store/timelineStore";

if (typeof window !== "undefined") {
  (window as any).CESIUM_BASE_URL = "/cesium";

  // Initialize Cesium Token (Use env var or empty string for offline/OSM mode)
  // Fix for 401: Even if we use OSM, some default widgets might try to access Ion assets
  Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";

  // Suppress Cesium Ion 401 errors in console (expected behavior when not using Ion)
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0];

    // Suppress Ion-related errors (Asset accesses)
    if (typeof message === 'string') {
      if (message.includes('api.cesium.com') || message.includes('401')) return;
    }

    // Check for RequestErrorEvent from Cesium
    if (args[0] && typeof args[0] === 'object' && 'statusCode' in (args[0] as object)) {
      const errorObj = args[0] as { statusCode?: number };
      if (errorObj.statusCode === 401) {
        return; // Silently ignore 401 errors
      }
    }
    originalConsoleError.apply(console, args);
  };
}

interface GlobeProps {
  objects?: SpaceObject[];
  onSelect?: (obj: SpaceObject | null) => void;
  selectedObject?: SpaceObject | null;
  onTelemetryUpdate?: (data: any) => void;
  filter?: string;
  searchQuery?: string;
  viewMode?: 'ORBIT' | 'SATELLITE_POV';
  settings?: AppSettings;
  observerPosition?: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  onHover?: (obj: SpaceObject | null) => void;
}

const Globe: React.FC<GlobeProps> = ({ objects = [], onSelect, selectedObject, onTelemetryUpdate, filter, searchQuery, viewMode = 'ORBIT', settings, observerPosition, onHover }) => {
  const [mounted, setMounted] = useState(false);
  const [viewerRef, setViewerRef] = useState<Cesium.Viewer | null>(null);
  const [isCompassMode, setIsCompassMode] = useState(false);
  const lastSyncRef = useRef<number>(0);

  // Get timeline state from Zustand store
  const { currentTime, isPlaying, multiplier, syncFromCesium } = useTimelineStore();

  // Create a stable reference for creditContainer to prevent Viewer recreation
  const creditContainer = useMemo(() => {
    if (typeof document !== 'undefined') {
      return document.createElement("div");
    }
    return undefined;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);



  // Sync Cesium Clock settings from Zustand store
  useEffect(() => {
    if (!viewerRef || viewerRef.isDestroyed()) return;

    const clock = viewerRef.clock;
    clock.multiplier = multiplier;
    clock.shouldAnimate = isPlaying;
  }, [viewerRef, isPlaying, multiplier]);

  // Listen to Cesium Clock ticks and sync to Zustand (throttled 100ms)
  useEffect(() => {
    if (!viewerRef || viewerRef.isDestroyed()) return;

    const clock = viewerRef.clock;
    const THROTTLE_MS = 100;

    const onTick = () => {
      const now = performance.now();
      if (now - lastSyncRef.current < THROTTLE_MS) return;
      lastSyncRef.current = now;

      try {
        const cesiumTime = Cesium.JulianDate.toDate(clock.currentTime);
        syncFromCesium(cesiumTime);
      } catch (e) {
        // Ignore conversion errors
      }
    };

    const removeListener = clock.onTick.addEventListener(onTick);

    return () => {
      removeListener();
    };
  }, [viewerRef, syncFromCesium]);

  // Track last Cesium time to detect user-initiated changes
  const lastCesiumTimeRef = useRef<number>(Date.now());

  // Sync time TO Cesium when currentTime changes (user action like seek or resetToNow)
  useEffect(() => {
    if (!viewerRef || viewerRef.isDestroyed()) return;

    const currentMs = currentTime.getTime();
    const cesiumMs = Cesium.JulianDate.toDate(viewerRef.clock.currentTime).getTime();

    // Only update if difference > 1 second (avoids fighting with Cesium's onTick)
    const timeDiff = Math.abs(currentMs - cesiumMs);
    if (timeDiff > 1000) {
      try {
        const julianDate = Cesium.JulianDate.fromDate(currentTime);
        viewerRef.clock.currentTime = julianDate;
        lastCesiumTimeRef.current = currentMs;
      } catch (e) { }
    }
  }, [viewerRef, currentTime]);

  // Compass / AR Mode Logic
  useEffect(() => {
    if (!isCompassMode || !viewerRef || viewerRef.isDestroyed()) return;

    const sensorManager = SensorManager.getInstance();

    // Subscribe to orientation updates
    const unsubscribe = sensorManager.subscribe((orientation) => {
      const camera = viewerRef.camera;
      const alpha = orientation.alpha || 0;
      const beta = orientation.beta || 0; // Tilt front-back (-180 to 180). 90 is upright.

      // Convert to Radians
      const headingRad = Cesium.Math.toRadians(360 - alpha);

      // Pitch: 
      const pitchDeg = (beta - 90);
      const pitchRad = Cesium.Math.toRadians(pitchDeg);

      camera.setView({
        orientation: {
          heading: headingRad,
          pitch: pitchRad,
          roll: 0
        }
      });
    });

    sensorManager.start();

    return () => {
      unsubscribe();
      sensorManager.stop();
    };
  }, [isCompassMode, viewerRef]);

  // Auto-Rotation Logic (Disabled in Compass Mode or when settings specify false)
  useEffect(() => {
    if (!viewerRef || viewerRef.isDestroyed()) return;
    const scene = viewerRef.scene;

    const rotateGlobe = () => {
      if (!selectedObject && viewMode === 'ORBIT' && !isCompassMode && settings?.autoRotateGlobe !== false && isPlaying) {
        viewerRef.camera.rotateLeft(0.0005);
      }
    };

    const removeListener = scene.preRender.addEventListener(rotateGlobe);
    return () => removeListener();
  }, [viewerRef, selectedObject, viewMode, isCompassMode, settings, isPlaying]);

  // Scene Configuration (Lighting & Atmosphere & Post-Process)
  useEffect(() => {
    if (viewerRef && !viewerRef.isDestroyed() && viewerRef.scene) {
      const scene = viewerRef.scene;
      const globe = scene.globe;

      const isMobile = window.innerWidth < 768;

      // Enable lighting based on settings (night shadow)
      globe.enableLighting = settings?.showNightShadow !== false;
      globe.atmosphereBrightnessShift = 0.1;

      // Atmospheric/Environment Enhancements
      if (scene.skyAtmosphere) scene.skyAtmosphere.show = true;
      if (scene.sun) scene.sun.show = true;
      if (scene.moon) scene.moon.show = true;
      if (scene.skyBox) scene.skyBox.show = true; // Stars

      if (isMobile) {
        // --- MOBILE OPTIMIZATION ---
        // Disable heavy post-processing
        scene.postProcessStages.bloom.enabled = false;
        // Lower resolution for FPS
        viewerRef.resolutionScale = 0.7;
        // Aggressive culling
        globe.tileCacheSize = 100;
      } else {
        // --- DESKTOP HIGH-FIDELITY ---
        viewerRef.resolutionScale = 1.0;
        // High-Contrast Bloom (Neon Effect)
        scene.postProcessStages.bloom.enabled = true;
        scene.postProcessStages.bloom.uniforms.contrast = 128;
        scene.postProcessStages.bloom.uniforms.brightness = -0.3;
        scene.postProcessStages.bloom.uniforms.delta = 1.0;
        scene.postProcessStages.bloom.uniforms.sigma = 2.0;
        scene.postProcessStages.bloom.uniforms.stepSize = 2.0;
      }
    }
  }, [viewerRef, settings?.showNightShadow]);

  // Cinematic Fly-in Animation
  useEffect(() => {
    if (viewerRef && !viewerRef.isDestroyed()) {
      const camera = viewerRef.camera;

      // Start from deep space
      camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(0, 0, 20000000), // Far away
        orientation: {
          heading: 0,
          pitch: -Cesium.Math.PI_OVER_TWO,
          roll: 0
        }
      });

      // Fly to initial view (e.g., over Turkey or Observer)
      const targetLat = observerPosition?.latitude || 39.9334;
      const targetLon = observerPosition?.longitude || 32.8597;

      setTimeout(() => {
        camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(targetLon, targetLat, 10000000), // Closer view
          duration: 4, // Seconds
          easingFunction: Cesium.EasingFunction.QUINTIC_IN_OUT,
        });
      }, 1000);
    }
  }, [viewerRef]);

  const toggleCompassMode = async () => {
    if (!isCompassMode) {
      // Try to request permission
      const granted = await SensorManager.getInstance().requestPermission();
      if (granted) {
        setIsCompassMode(true);
      } else {
        alert("Compass permission denied or not supported.");
      }
    } else {
      setIsCompassMode(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-black">
      <Viewer
        ref={(e) => { if (e && e.cesiumElement) setViewerRef(e.cesiumElement); }}
        full
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        navigationHelpButton={false}
        selectionIndicator={false}
        infoBox={false}
        requestRenderMode={false}
        creditContainer={creditContainer}
        terrainProvider={defaultTerrainProvider}
        baseLayer={defaultBaseLayer}
      >
        <Scene highDynamicRange={true} />

        <SatelliteLayer
          objects={objects}
          onSelect={onSelect}
          selectedId={selectedObject?.id}
          onTelemetryUpdate={onTelemetryUpdate}
          filter={filter}
          searchQuery={searchQuery}
          viewMode={viewMode}
          settings={settings}
          observerPosition={observerPosition}
          onHover={onHover}
        />
      </Viewer>

      {/* Compass / AR Toggle Button */}
      <button
        onClick={toggleCompassMode}
        className={`absolute top-24 left-6 z-10 p-3 rounded-full transition-all duration-300 shadow-lg backdrop-blur-md border ${isCompassMode ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-slate-900/80 text-cyan-400 border-white/10 hover:bg-slate-800'}`}
        aria-label="Toggle AR Compass Mode"
        aria-pressed={isCompassMode}
        title="AR Compass Mode"
      >
        {isCompassMode ? <Compass className="animate-spin-slow" aria-hidden="true" /> : <Smartphone aria-hidden="true" />}
      </button>
    </div>
  );
};

export default memo(Globe);
