"use client";

import React, { memo, useState, useEffect, useMemo } from "react";
import { Flame, Activity, Sun } from "lucide-react";
import { SpaceObject } from "@/lib/space-objects";
import {
  predictOrbitalDecay,
  parseBStar,
  DecayPrediction,
} from "@/lib/OrbitalDecay";
import {
  fetchSpaceWeather,
  SpaceWeatherData,
  getDensityCorrectionFactor,
} from "@/lib/SpaceWeather";

interface MobileDecayCardProps {
  satelliteObj: SpaceObject | null;
  altitudeKm: number | null;
}

const MobileDecayCard: React.FC<MobileDecayCardProps> = ({
  satelliteObj,
  altitudeKm,
}) => {
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeatherData | null>(null);

  // Fetch space weather on mount
  useEffect(() => {
    fetchSpaceWeather().then(setSpaceWeather).catch(console.error);
  }, []);

  const prediction = useMemo<DecayPrediction | null>(() => {
    if (!satelliteObj || !satelliteObj.tle || !altitudeKm || altitudeKm < 0) return null;

    const { line1, line2 } = satelliteObj.tle;
    const bstar = parseBStar(line1);

    // Extract eccentricity from TLE line 2 (e.g. chars 26-33)
    let eccentricity = 0.001;
    try {
      const eccStr = "0." + line2.substring(26, 33).trim();
      const parsed = parseFloat(eccStr);
      if (!isNaN(parsed)) eccentricity = parsed;
    } catch {}

    const semiMajorAxis = 6371 + altitudeKm;
    const densityFactor = spaceWeather ? getDensityCorrectionFactor(spaceWeather) : 1.0;
    const adjustedBstar = bstar * densityFactor;

    return predictOrbitalDecay(semiMajorAxis, eccentricity, adjustedBstar, new Date());
  }, [satelliteObj, altitudeKm, spaceWeather]);

  if (!satelliteObj || !prediction) return null;

  const riskBadgeClass = {
    low: "vanilla-badge vanilla-badge-success",
    medium: "vanilla-badge vanilla-badge-warning",
    high: "vanilla-badge vanilla-badge-danger",
    critical: "vanilla-badge vanilla-badge-danger",
  }[prediction.riskLevel];

  return (
    <div className="vanilla-card">
      <div className="vanilla-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Flame size={16} style={{ color: "var(--accent-orbit)" }} />
          <h4 className="vanilla-card-title">Decay Prediction</h4>
        </div>
        <span className={riskBadgeClass}>{prediction.riskLevel} RISK</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Estimated lifetime */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--surface-border)",
            borderRadius: "var(--radius-interactive)",
            padding: "12px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <span
                style={{
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  display: "block",
                }}
              >
                Estimated Lifetime
              </span>
              <span style={{ fontSize: "20px", fontWeight: "bold", color: "var(--text-primary)" }}>
                {prediction.estimatedLifetimeDays > 365
                  ? `${(prediction.estimatedLifetimeDays / 365).toFixed(1)} years`
                  : `${prediction.estimatedLifetimeDays} days`}
              </span>
            </div>
            {prediction.estimatedReentryDate && (
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Est: {new Date(prediction.estimatedReentryDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Space Weather Metrics */}
        <div style={{ display: "flex", gap: "12px" }}>
          <div
            style={{
              flex: 1,
              backgroundColor: "rgba(255, 255, 255, 0.01)",
              border: "1px solid var(--surface-border)",
              borderRadius: "var(--radius-interactive)",
              padding: "10px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "9px",
                color: "var(--text-muted)",
                textTransform: "uppercase",
              }}
            >
              <Sun size={10} /> Solar Index
            </div>
            <div className="vanilla-mono" style={{ fontSize: "13px", color: "var(--text-primary)", marginTop: "2px" }}>
              {spaceWeather?.f107 || "---"} sfu
            </div>
          </div>

          <div
            style={{
              flex: 1,
              backgroundColor: "rgba(255, 255, 255, 0.01)",
              border: "1px solid var(--surface-border)",
              borderRadius: "var(--radius-interactive)",
              padding: "10px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "9px",
                color: "var(--text-muted)",
                textTransform: "uppercase",
              }}
            >
              <Activity size={10} /> Geomagnetic (Kp)
            </div>
            <div className="vanilla-mono" style={{ fontSize: "13px", color: "var(--text-primary)", marginTop: "2px" }}>
              {spaceWeather?.kpIndex || "---"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(MobileDecayCard);
