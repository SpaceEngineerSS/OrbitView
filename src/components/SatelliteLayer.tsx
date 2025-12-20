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
  const shouldFlyToRef = useRef(false);

  useEffect(() => {
    if (selectedId) {
      shouldFlyToRef.current = true;
      setSelectedSatPos(null);
    }
  }, [selectedId]);

  // Handle Camera Tracking
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

    if (viewMode === 'SATELLITE_POV') {
      viewer.camera.setView({
        destination: selectedSatPos,
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }
      });
    }
  }, [viewer, selectedId, selectedSatPos, viewMode]);

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
