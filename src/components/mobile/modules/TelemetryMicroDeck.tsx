"use client";

import React, { memo, useMemo } from "react";
import { SpaceObject } from "@/lib/space-objects";

interface TelemetryData {
  lat: number;
  lon: number;
  alt: number;
  velocity: number;
}

interface TelemetryMicroDeckProps {
  selectedObject: SpaceObject | null;
  telemetry: TelemetryData | null;
}

const TelemetryMicroDeck: React.FC<TelemetryMicroDeckProps> = ({
  selectedObject,
  telemetry,
}) => {
  const altitudeDisplay = useMemo(() => {
    if (!telemetry) return "--- km";
    return `${telemetry.alt.toFixed(1)} km`;
  }, [telemetry]);

  const velocityDisplay = useMemo(() => {
    if (!telemetry) return "--- km/s";
    return `${telemetry.velocity.toFixed(2)} km/s`;
  }, [telemetry]);

  const latDisplay = useMemo(() => {
    if (!telemetry) return "---";
    const abs = Math.abs(telemetry.lat);
    const dir = telemetry.lat >= 0 ? "N" : "S";
    return `${abs.toFixed(3)}°${dir}`;
  }, [telemetry]);

  const lonDisplay = useMemo(() => {
    if (!telemetry) return "---";
    const abs = Math.abs(telemetry.lon);
    const dir = telemetry.lon >= 0 ? "E" : "W";
    return `${abs.toFixed(3)}°${dir}`;
  }, [telemetry]);

  const orbitalPeriod = useMemo(() => {
    if (!telemetry) return "--- min";
    const earthRadius = 6371;
    const altitude = telemetry.alt;
    const semiMajorAxis = earthRadius + altitude;
    const mu = 398600.4418;
    const periodSec = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu);
    const minutes = Math.round(periodSec / 60);
    return `${minutes} min`;
  }, [telemetry]);

  if (!selectedObject) return null;

  return (
    <div className="vanilla-telemetry-grid">
      <div className="vanilla-telemetry-item">
        <span className="vanilla-telemetry-label">Altitude</span>
        <span className="vanilla-telemetry-value">{altitudeDisplay}</span>
      </div>

      <div className="vanilla-telemetry-item">
        <span className="vanilla-telemetry-label">Velocity</span>
        <span className="vanilla-telemetry-value">{velocityDisplay}</span>
      </div>

      <div className="vanilla-telemetry-item">
        <span className="vanilla-telemetry-label">Latitude</span>
        <span className="vanilla-telemetry-value">{latDisplay}</span>
      </div>

      <div className="vanilla-telemetry-item">
        <span className="vanilla-telemetry-label">Longitude</span>
        <span className="vanilla-telemetry-value">{lonDisplay}</span>
      </div>

      <div className="vanilla-telemetry-item">
        <span className="vanilla-telemetry-label">Orbital Period</span>
        <span className="vanilla-telemetry-value">{orbitalPeriod}</span>
      </div>

      <div className="vanilla-telemetry-item">
        <span className="vanilla-telemetry-label">Uplink Status</span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
          <div
            className="pulse-green"
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "var(--signal-success)",
            }}
          />
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--signal-success)" }}>
            ACTIVE
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(TelemetryMicroDeck);
