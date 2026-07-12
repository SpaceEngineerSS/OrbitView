"use client";

import React, { memo, useState, useEffect, useRef } from "react";
import { motion, PanInfo } from "framer-motion";
import { X, Satellite } from "lucide-react";
import { SpaceObject } from "@/lib/space-objects";
import TelemetryMicroDeck from "../modules/TelemetryMicroDeck";
import MobileDopplerCard from "../scientific/MobileDopplerCard";
import MobileDecayCard from "../scientific/MobileDecayCard";
import MobilePassCard from "../scientific/MobilePassCard";
import { useHaptic } from "@/hooks/useHaptic";

interface NativeBottomSheetProps {
  satellite: SpaceObject | null;
  telemetry: { lat: number; lon: number; alt: number; velocity: number } | null;
  onClose: () => void;
}

type SheetTier = 1 | 2 | 3;

const NativeBottomSheet: React.FC<NativeBottomSheetProps> = ({
  satellite,
  telemetry,
  onClose,
}) => {
  const [tier, setTier] = useState<SheetTier>(1);
  const { trigger } = useHaptic();
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset to Tier 1 when selected satellite changes
  useEffect(() => {
    if (satellite) {
      setTier(1);
    }
  }, [satellite]);

  if (!satellite) return null;

  // Calculate height by tier
  const getSheetHeight = () => {
    switch (tier) {
      case 1:
        return 170; // Peak view
      case 2:
        return window.innerHeight * 0.45; // Split View
      case 3:
        return window.innerHeight * 0.92; // Full screen modal lab
      default:
        return 170;
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.y;
    const velocity = info.velocity.y;

    // Thresholds for snap triggering
    if (velocity > 400 || offset > 100) {
      // Swiped down
      if (tier === 3) {
        trigger("light");
        setTier(2);
      } else if (tier === 2) {
        trigger("light");
        setTier(1);
      } else {
        trigger("medium");
        onClose();
      }
    } else if (velocity < -400 || offset < -100) {
      // Swiped up
      if (tier === 1) {
        trigger("light");
        setTier(2);
      } else if (tier === 2) {
        trigger("light");
        setTier(3);
      }
    }
  };

  const currentObserver = {
    latitude: 39.9334, // Ankara
    longitude: 32.8597,
    altitude: 0,
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 220 }}
      className="vanilla-bottom-sheet pointer-events-auto"
      style={{
        height: getSheetHeight(),
        maxHeight: "95vh",
      }}
    >
      {/* Drag handle header */}
      <div className="vanilla-sheet-handle-wrapper" onPointerDown={() => {}}>
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.4}
          onDragEnd={handleDragEnd}
          style={{ width: "100%", display: "flex", justifyContent: "center", padding: "8px 0" }}
        >
          <div className="vanilla-sheet-handle" />
        </motion.div>
      </div>

      {/* Header Info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 var(--space-4) var(--space-2) var(--space-4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Satellite size={18} style={{ color: "var(--primary-uplink)" }} />
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {satellite.name}
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>
              #{satellite.id}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            trigger("medium");
            onClose();
          }}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--text-muted)",
            padding: "8px",
            cursor: "pointer",
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Sheet content area */}
      <div ref={contentRef} className="vanilla-sheet-content">
        {/* Tier 1 & Tier 2: Telemetry Deck */}
        {tier <= 2 && (
          <div style={{ marginTop: "8px" }}>
            <TelemetryMicroDeck selectedObject={satellite} telemetry={telemetry} />
            {tier === 1 && (
              <div
                onClick={() => {
                  trigger("light");
                  setTier(2);
                }}
                style={{
                  textAlign: "center",
                  fontSize: "11px",
                  color: "var(--primary-uplink)",
                  padding: "8px 0",
                  cursor: "pointer",
                  marginTop: "8px",
                }}
              >
                SWIPE UP FOR DETAILED LAB
              </div>
            )}
          </div>
        )}

        {/* Tier 3: Full Scientific Laboratory */}
        {tier === 3 && (
          <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <TelemetryMicroDeck selectedObject={satellite} telemetry={telemetry} />
            <MobileDopplerCard satelliteObj={satellite} observer={currentObserver} />
            <MobilePassCard satelliteObj={satellite} observer={currentObserver} />
            <MobileDecayCard satelliteObj={satellite} altitudeKm={telemetry ? telemetry.alt : null} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default memo(NativeBottomSheet);
