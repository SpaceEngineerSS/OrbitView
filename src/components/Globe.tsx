"use client";

import React, { useEffect, useState, useRef, useMemo, memo } from "react";
import { Viewer, Scene } from "resium";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import SatelliteLayer from "./SatelliteLayer";
import { SpaceObject } from "@/lib/space-objects";
import * as satellite from "satellite.js";
import { Compass, Smartphone } from "lucide-react";
import { SensorManager } from "@/lib/SensorManager";

if (typeof window !== "undefined") {
  (window as any).CESIUM_BASE_URL = "/cesium";
}

interface GlobeSettings {
  showGroundTrack?: boolean;
  showFootprint?: boolean;
  showNightShadow?: boolean;
  showOrbitPaths?: boolean;
  enableLOD?: boolean;
}

interface GlobeProps {
  currentTime?: Date | null;
  objects: SpaceObject[];
  onSelect?: (obj: SpaceObject | null) => void;
  selectedObject?: SpaceObject | null;
  onTelemetryUpdate?: (data: any) => void;
  filter?: string;
  searchQuery?: string;
  viewMode?: 'ORBIT' | 'SATELLITE_POV';
  settings?: GlobeSettings;
  observerPosition?: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  onHover?: (obj: SpaceObject | null) => void;
}

const Globe: React.FC<GlobeProps> = ({ currentTime, objects = [], onSelect, selectedObject, onTelemetryUpdate, filter, searchQuery, viewMode = 'ORBIT', settings, observerPosition, onHover }) => {
  const [mounted, setMounted] = useState(false);
  const [viewerRef, setViewerRef] = useState<Cesium.Viewer | null>(null);
  const [isCompassMode, setIsCompassMode] = useState(false);

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

  // Sync Time
  useEffect(() => {
    if (!viewerRef || viewerRef.isDestroyed()) return;

    if (viewerRef.clock && currentTime) {
      try {
        const julianDate = Cesium.JulianDate.fromDate(currentTime);
        viewerRef.clock.currentTime = julianDate;
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

      // Convert Alpha (Compass) to Heading (Radians)
      // Alpha is 0-360 degrees. 0 = North.
      // Cesium Heading: 0 = North, increasing Eastward (Clockwise).
      // DeviceAlpha: 0 = North, increasing Westward (Counter-Clockwise) usually?
      // Actually standard: Alpha increases counter-clockwise (East is 90? No, West is 90?). 
      // MDN: z-axis is positive up. alpha is rotation around z-axis. 0 is north. 90 is West, 270 is East.
      // Cesium: Heading is rotation around negative z-axis. 0 is North. 90 is East.
      // So Cesium Heading = -Alpha (approx).

      const alpha = orientation.alpha || 0;
      const beta = orientation.beta || 0; // Tilt front-back (-180 to 180). 90 is upright.

      // Convert to Radians
      const headingRad = Cesium.Math.toRadians(360 - alpha);

      // Pitch: 
      // Phone upright (vertical) -> Beta = 90. We want Camera Pitch = 0 (Horizon).
      // Phone flat (horizontal) -> Beta = 0. We want Camera Pitch = -90 (Looking down).
      // So Pitch = Beta - 90.
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

  // Auto-Rotation Logic (Disabled in Compass Mode)
  useEffect(() => {
    if (!viewerRef || viewerRef.isDestroyed()) return;
    const scene = viewerRef.scene;

    const rotateGlobe = () => {
      if (!selectedObject && viewMode === 'ORBIT' && !isCompassMode) {
        viewerRef.camera.rotateLeft(0.0005);
      }
    };

    const removeListener = scene.preRender.addEventListener(rotateGlobe);
    return () => removeListener();
  }, [viewerRef, selectedObject, viewMode, isCompassMode]);

  // Scene Configuration (Lighting & Atmosphere)
  useEffect(() => {
    if (viewerRef && !viewerRef.isDestroyed() && viewerRef.scene) {
      const globe = viewerRef.scene.globe;
      // Enable lighting based on settings (night shadow)
      globe.enableLighting = settings?.showNightShadow !== false;
      globe.atmosphereBrightnessShift = 0.1;
    }
  }, [viewerRef, settings?.showNightShadow]);

  const toggleCompassMode = async () => {
    if (!isCompassMode) {
      // Try to request permission
      const granted = await SensorManager.getInstance().requestPermission();
      if (granted) {
        setIsCompassMode(true);
        // Lock camera to observer position (simulated) if needed, or just let them look around orbit
        // Ideally tracking mode should put camera at observer location (surface).
        // For now, let's just rotate the current camera view.
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
        requestRenderMode={true}
        maximumRenderTimeChange={Infinity}
        creditContainer={creditContainer}
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
      <div className="absolute top-24 left-6 z-10 flex flex-col gap-2">
        {/* Original Sidebar takes top-left, adjusted to avoid overlap if needed, 
             but Sidebar is toggleable. Let's put this below the sidebar toggle or on the right? 
             Sidebar toggle is fixed top-6 left-6. 
             This button will be top-20 left-6. 
         */}
      </div>
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
