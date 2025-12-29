"use client";

import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import { useCesium } from "resium";
import * as Cesium from "cesium";
import { SpaceObject } from "@/lib/space-objects";
import TLELayer from "./Globe/TLELayer";
import EphemerisLayer from "./Globe/EphemerisLayer";
import SelectedSatelliteExtras from "./Globe/SelectedSatelliteExtras";
import { AppSettings, DEFAULT_SETTINGS } from "./HUD/SettingsPanel";

interface SatelliteLayerProps {
  objects: SpaceObject[];
  onSelect?: (obj: SpaceObject | null) => void;
  selectedId?: string;
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

const SatelliteLayer: React.FC<SatelliteLayerProps> = ({
  objects = [], onSelect, selectedId, onTelemetryUpdate, filter = "ALL", searchQuery = "", viewMode = 'ORBIT', settings, observerPosition, onHover
}) => {
  const { viewer } = useCesium();
  const [selectedSatPos, setSelectedSatPos] = useState<Cesium.Cartesian3 | null>(null);
  const [selectedSatVelocity, setSelectedSatVelocity] = useState<Cesium.Cartesian3 | null>(null);
  const shouldFlyToRef = useRef(false);
  const lastPOVUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (selectedId) {
      shouldFlyToRef.current = true;
      setSelectedSatPos(null);
      setSelectedSatVelocity(null);
    }
  }, [selectedId]);

  // Handle Camera Tracking with Quaternion velocity-vector lock
  useEffect(() => {
    if (!viewer || !selectedId || !selectedSatPos) return;

    if (shouldFlyToRef.current) {
      shouldFlyToRef.current = false;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(selectedSatPos).longitude),
          Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(selectedSatPos).latitude),
          5000000
        )
      });
    }

    /**
     * SATELLITE_POV: Cockpit-style view
     * 
     * @scientific_reference Vallado, D.A. "Fundamentals of Astrodynamics"
     * 
     * Camera orientation:
     * - Position: At satellite location
     * - Direction: Along velocity vector (prograde)
     * - Up: Radial outward (away from Earth center)
     */
    if (viewMode === 'SATELLITE_POV') {
      const now = performance.now();
      if (now - lastPOVUpdateRef.current < 50) return; // Throttle to 20fps
      lastPOVUpdateRef.current = now;

      // Calculate radial (up) vector - from Earth center to satellite
      const up = Cesium.Cartesian3.normalize(selectedSatPos, new Cesium.Cartesian3());

      // Use velocity if available, otherwise estimate from position delta
      let direction: Cesium.Cartesian3;
      if (selectedSatVelocity && Cesium.Cartesian3.magnitude(selectedSatVelocity) > 0.1) {
        // Normalize velocity vector for direction
        direction = Cesium.Cartesian3.normalize(selectedSatVelocity, new Cesium.Cartesian3());
      } else {
        // Fallback: East direction tangent (prograde for most orbits)
        const carto = Cesium.Cartographic.fromCartesian(selectedSatPos);
        const eastPoint = Cesium.Cartesian3.fromRadians(
          carto.longitude + 0.001,
          carto.latitude,
          carto.height
        );
        direction = Cesium.Cartesian3.normalize(
          Cesium.Cartesian3.subtract(eastPoint, selectedSatPos, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        );
      }

      // Ensure direction is orthogonal to up (Gram-Schmidt orthogonalization)
      const dot = Cesium.Cartesian3.dot(direction, up);
      const correction = Cesium.Cartesian3.multiplyByScalar(up, dot, new Cesium.Cartesian3());
      direction = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.subtract(direction, correction, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
      );

      // Calculate right vector (cross product of direction and up)
      const right = Cesium.Cartesian3.cross(direction, up, new Cesium.Cartesian3());
      Cesium.Cartesian3.normalize(right, right);

      // Set camera with computed orientation
      viewer.camera.setView({
        destination: selectedSatPos,
        orientation: {
          direction: direction,
          up: up
        }
      });
    }
  }, [viewer, selectedId, selectedSatPos, selectedSatVelocity, viewMode]);

  // Update position and velocity from TLELayer callback
  const handleUpdatePosition = useCallback((pos: Cesium.Cartesian3 | null, vel?: Cesium.Cartesian3) => {
    setSelectedSatPos(pos);
    if (vel) setSelectedSatVelocity(vel);
  }, []);

  const handleTelemetry = useCallback(() => {
    if (!viewer || !selectedId || !selectedSatPos) return;
    const carto = Cesium.Cartographic.fromCartesian(selectedSatPos);
    onTelemetryUpdate?.({
      lat: Cesium.Math.toDegrees(carto.latitude),
      lon: Cesium.Math.toDegrees(carto.longitude),
      alt: carto.height / 1000,
      velocity: 0 // Velocity calculated in component if TLE
    });
  }, [viewer, selectedId, selectedSatPos, onTelemetryUpdate]);

  useEffect(() => {
    const timer = setInterval(handleTelemetry, 1000);
    return () => clearInterval(timer);
  }, [handleTelemetry]);

  return (
    <>
      <TLELayer
        objects={objects}
        selectedId={selectedId}
        filter={filter}
        searchQuery={searchQuery}
        settings={settings || DEFAULT_SETTINGS}
        onUpdateSelectedPos={setSelectedSatPos}
        onHover={(o: SpaceObject | null) => onHover?.(o)}
        onSelect={(o: SpaceObject | null) => onSelect?.(o)}
      />

      <EphemerisLayer
        objects={objects}
        selectedId={selectedId}
        searchQuery={searchQuery}
        onUpdateSelectedPos={setSelectedSatPos}
      />

      <SelectedSatelliteExtras
        selectedId={selectedId}
        objects={objects}
        settings={settings || DEFAULT_SETTINGS}
        observerPosition={observerPosition}
        selectedSatPos={selectedSatPos}
      />
    </>
  );
};

export default memo(SatelliteLayer);
