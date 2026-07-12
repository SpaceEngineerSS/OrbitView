"use client";

import React, { memo, useState, useMemo } from "react";
import { Radio, Settings } from "lucide-react";
import * as satellite from "satellite.js";
import { SpaceObject } from "@/lib/space-objects";
import { useTimelineStore } from "@/store/timelineStore";
import {
  calculateDopplerShift,
  formatFrequency,
  formatDopplerShift,
  COMMON_FREQUENCIES,
  ObserverPosition,
  SatelliteState,
} from "@/lib/DopplerCalculator";
import { useHaptic } from "@/hooks/useHaptic";

interface MobileDopplerCardProps {
  satelliteObj: SpaceObject | null;
  observer: ObserverPosition;
}

const presets = [
  { name: "ISS Voice", freq: COMMON_FREQUENCIES.ISS_VOICE, desc: "145.800 MHz" },
  { name: "ISS APRS", freq: COMMON_FREQUENCIES.ISS_PACKET, desc: "145.825 MHz" },
  { name: "NOAA APT", freq: COMMON_FREQUENCIES.NOAA_APT, desc: "137.100 MHz" },
  { name: "GPS L1", freq: COMMON_FREQUENCIES.GPS_L1, desc: "1575.42 MHz" },
];

const MobileDopplerCard: React.FC<MobileDopplerCardProps> = ({
  satelliteObj,
  observer,
}) => {
  const [baseFrequency, setBaseFrequency] = useState(COMMON_FREQUENCIES.ISS_VOICE);
  const [showSettings, setShowSettings] = useState(false);
  const { currentTime } = useTimelineStore();
  const { trigger } = useHaptic();

  // Propagate and calculate Doppler shift in real-time
  const dopplerResult = useMemo(() => {
    if (!satelliteObj || !satelliteObj.tle) return null;

    try {
      const { line1, line2 } = satelliteObj.tle;
      const satrec = satellite.twoline2satrec(line1, line2);
      const time = new Date(currentTime);

      const positionAndVelocity = satellite.propagate(satrec, time);
      if (!positionAndVelocity || !positionAndVelocity.position || !positionAndVelocity.velocity) return null;

      const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;
      const velocityEci = positionAndVelocity.velocity as satellite.EciVec3<number>;
        const gmst = satellite.gstime(time);
        const positionEcf = satellite.eciToEcf(positionEci, gmst);
        const velocityEcf = satellite.eciToEcf(velocityEci, gmst);

        const satelliteState: SatelliteState = {
          position: {
            x: positionEcf.x * 1000,
            y: positionEcf.y * 1000,
            z: positionEcf.z * 1000,
          },
          velocity: {
            x: velocityEcf.x * 1000,
            y: velocityEcf.y * 1000,
            z: velocityEcf.z * 1000,
          },
        };

        return calculateDopplerShift(satelliteState, observer, baseFrequency);
    } catch (err) {
      console.error("[Doppler calculation error]", err);
    }
    return null;
  }, [satelliteObj, observer.latitude, observer.longitude, observer.altitude, baseFrequency, currentTime]);

  if (!satelliteObj) return null;

  return (
    <div className="vanilla-card">
      <div className="vanilla-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Radio size={16} style={{ color: "var(--primary-uplink)" }} />
          <h4 className="vanilla-card-title">Doppler Analysis</h4>
        </div>
        <button
          onClick={() => {
            trigger("light");
            setShowSettings(!showSettings);
          }}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          <Settings size={16} />
        </button>
      </div>

      {showSettings && (
        <div
          style={{
            padding: "12px",
            border: "1px solid var(--surface-border)",
            borderRadius: "var(--radius-interactive)",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              fontWeight: "bold",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "8px",
            }}
          >
            Frequency Presets
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  trigger("medium");
                  setBaseFrequency(preset.freq);
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-interactive)",
                  fontSize: "10px",
                  fontWeight: "bold",
                  border: "1px solid",
                  borderColor:
                    baseFrequency === preset.freq ? "var(--primary-uplink)" : "var(--surface-border)",
                  backgroundColor:
                    baseFrequency === preset.freq ? "rgba(0, 243, 255, 0.1)" : "transparent",
                  color: baseFrequency === preset.freq ? "var(--primary-uplink)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {preset.name} ({preset.desc})
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Frequency readouts */}
        <div style={{ display: "flex", gap: "12px" }}>
          <div
            style={{
              flex: 1,
              backgroundColor: "rgba(255,255,255,0.01)",
              border: "1px solid var(--surface-border)",
              borderRadius: "var(--radius-interactive)",
              padding: "10px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>
              TX Freq
            </div>
            <div className="vanilla-mono" style={{ fontSize: "14px", color: "var(--text-primary)" }}>
              {formatFrequency(baseFrequency)}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: "rgba(255,255,255,0.01)",
              border: "1px solid var(--surface-border)",
              borderRadius: "var(--radius-interactive)",
              padding: "10px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>
              RX Freq
            </div>
            <div className="vanilla-mono" style={{ fontSize: "14px", color: "var(--primary-uplink)" }}>
              {dopplerResult ? formatFrequency(dopplerResult.receivedFreqHz) : "---"}
            </div>
          </div>
        </div>

        {/* Doppler shift values */}
        {dopplerResult && (
          <div
            style={{
              padding: "12px",
              borderRadius: "var(--radius-interactive)",
              border: "1px solid var(--surface-border)",
              backgroundColor: "rgba(255, 255, 255, 0.01)",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span
                  style={{
                    fontSize: "9px",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    display: "block",
                  }}
                >
                  Doppler Shift
                </span>
                <span
                  className="vanilla-mono"
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: dopplerResult.isApproaching ? "var(--signal-success)" : "var(--signal-danger)",
                  }}
                >
                  {formatDopplerShift(dopplerResult.dopplerShiftHz)}
                </span>
              </div>
              <span
                className={dopplerResult.isApproaching ? "vanilla-badge vanilla-badge-success" : "vanilla-badge vanilla-badge-danger"}
              >
                {dopplerResult.isApproaching ? "APPROACHING" : "RECEDING"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(MobileDopplerCard);
