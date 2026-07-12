"use client";

import React, { memo, useState, useEffect } from "react";
import { Calendar, Clock, Compass } from "lucide-react";
import { SpaceObject } from "@/lib/space-objects";
import { SatelliteData } from "@/lib/tle";
import {
  ObserverLocation,
  predictPasses,
  SatellitePass,
  getLookAngles,
} from "@/lib/PassPrediction";

interface MobilePassCardProps {
  satelliteObj: SpaceObject | null;
  observer: ObserverLocation;
}

const MobilePassCard: React.FC<MobilePassCardProps> = ({
  satelliteObj,
  observer,
}) => {
  const [passes, setPasses] = useState<SatellitePass[]>([]);
  const [calculating, setCalculating] = useState(false);

  // Calculate passes on mount/change
  useEffect(() => {
    if (!satelliteObj || !satelliteObj.tle) return;
    const tle = satelliteObj.tle;

    setCalculating(true);
    const timer = setTimeout(() => {
      try {
        const satData: SatelliteData = {
          id: satelliteObj.id,
          name: satelliteObj.name,
          line1: tle.line1,
          line2: tle.line2,
          category: satelliteObj.category as any,
        };

        const now = new Date();
        const end = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 Hours
        const results = predictPasses(satData, observer, now, end, 10); // min elevation 10°
        setPasses(results);
      } catch (err) {
        console.error("[Pass prediction error]", err);
      } finally {
        setCalculating(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [satelliteObj, observer.latitude, observer.longitude, observer.altitude]);

  if (!satelliteObj) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="vanilla-card">
      <div className="vanilla-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Calendar size={16} style={{ color: "var(--primary-uplink)" }} />
          <h4 className="vanilla-card-title">Upcoming Passes</h4>
        </div>
        <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: "bold" }}>
          NEXT 24H • MIN 10°
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {calculating ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
            Calculating pass trajectories...
          </div>
        ) : passes.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Next pass highlight */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(0, 243, 255, 0.05), rgba(0, 243, 255, 0.01))",
                border: "1px solid rgba(0, 243, 255, 0.2)",
                borderRadius: "var(--radius-interactive)",
                padding: "12px",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "9px", color: "var(--primary-uplink)", fontWeight: "bold", textTransform: "uppercase" }}>
                  Next Overhead Pass
                </span>
                <span className="vanilla-badge vanilla-badge-success">AOS Soon</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--text-primary)" }}>
                    {formatTime(passes[0].aosTime)}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Duration: {formatDuration(passes[0].duration)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="vanilla-mono" style={{ fontSize: "14px", color: "var(--primary-uplink)", fontWeight: "bold" }}>
                    {passes[0].maxElevation.toFixed(1)}°
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>MAX ELEVATION</div>
                </div>
              </div>
            </div>

            {/* List of remaining passes */}
            {passes.slice(1, 4).map((pass, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-interactive)",
                  backgroundColor: "rgba(255, 255, 255, 0.01)",
                  border: "1px solid var(--surface-border)",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock size={12} style={{ color: "var(--text-muted)" }} />
                  <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>
                    {formatTime(pass.aosTime)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {formatDuration(pass.duration)}
                  </span>
                  <span
                    className="vanilla-mono"
                    style={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "var(--primary-uplink)",
                    }}
                  >
                    {pass.maxElevation.toFixed(0)}°
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "20px 0",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "12px",
              border: "1px dashed var(--surface-border)",
              borderRadius: "var(--radius-interactive)",
            }}
          >
            No overhead passes predicted in the next 24 hours.
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(MobilePassCard);
