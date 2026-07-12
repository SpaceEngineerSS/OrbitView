"use client";

import React, { memo, useState, useEffect } from "react";
import { Search, Compass, Activity, ShieldAlert } from "lucide-react";
import { SpaceObject } from "@/lib/space-objects";
import { AppSettings } from "@/components/hud/SettingsPanel";
import BottomNavigation from "./BottomNavigation";
import NativeBottomSheet from "./NativeBottomSheet";
import MobileTimeController from "../modules/MobileTimeController";
import MobileSearchOverlay from "../modules/MobileSearchOverlay";
import MobileDopplerCard from "../scientific/MobileDopplerCard";
import MobileDecayCard from "../scientific/MobileDecayCard";
import MobilePassCard from "../scientific/MobilePassCard";
import { useHaptic } from "@/hooks/useHaptic";

interface MobileAppShellProps {
  objects: SpaceObject[];
  loading: boolean;
  selectedSatellite: SpaceObject | null;
  onSelect: (sat: SpaceObject | null) => void;
  telemetry: { lat: number; lon: number; alt: number; velocity: number } | null;
  onTelemetryUpdate: (data: any) => void;
  activeView: "globe" | "analytics" | "settings";
  onViewChange: (view: "globe" | "analytics" | "settings") => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

const MobileAppShell: React.FC<MobileAppShellProps> = ({
  objects,
  loading,
  selectedSatellite,
  onSelect,
  telemetry,
  onTelemetryUpdate,
  activeView,
  onViewChange,
  settings,
  onSettingsChange,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { trigger } = useHaptic();

  // Performance profiling for low-end mobile devices
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cores = navigator.hardwareConcurrency || 4;
      if (cores < 4) {
        console.warn("[PERFORMANCE] Low-end mobile hardware detected. Disabling high-fidelity features.");
        onSettingsChange({
          ...settings,
          maxSatellites: Math.min(settings.maxSatellites, 800),
          orbitPathQuality: "low",
          showNightShadow: false,
          autoRotateGlobe: false,
        });
      }
    }
  }, []);

  const observer = {
    latitude: 39.9334, // Ankara
    longitude: 32.8597,
    altitude: 0,
  };

  return (
    <div className={`vanilla-app-shell ${activeView === "globe" ? "vanilla-app-shell-globe" : ""}`}>
      {/* Top Header */}
      <header className="vanilla-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "rgba(0, 243, 255, 0.1)",
              border: "1px solid rgba(0, 243, 255, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Activity size={18} style={{ color: "var(--primary-uplink)" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "14px", fontWeight: "bold", margin: 0, letterSpacing: "0.05em" }}>
              ORBITVIEW
            </h1>
            <span style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: "500" }}>
              V3.0 COMMAND CENTER
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            trigger("light");
            setIsSearchOpen(true);
          }}
          className="vanilla-search-trigger pointer-events-auto"
          aria-label="Search Satellites"
        >
          <Search size={18} />
        </button>
      </header>

      {/* Main View Area */}
      <div style={{ flex: 1, position: "relative", width: "100%", height: "100%" }}>
        {/* MAP VIEW OVERLAYS */}
        {activeView === "globe" && (
          <>
            {/* Time controller pill */}
            <MobileTimeController isVisible={!selectedSatellite} />

            {/* Drag Bottom Sheet for target inspection */}
            {selectedSatellite && (
              <NativeBottomSheet
                satellite={selectedSatellite}
                telemetry={telemetry}
                onClose={() => {
                  onSelect(null);
                }}
              />
            )}
          </>
        )}

        {/* ANALYTICS VIEW */}
        {activeView === "analytics" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 35,
              background: "var(--bg-space)",
              padding: "70px 16px calc(24px + 80px) 16px",
              overflowY: "auto",
              boxSizing: "border-box",
            }}
            className="pointer-events-auto"
          >
            {selectedSatellite ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: "12px",
                    borderBottom: "1px solid var(--surface-border)",
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>
                      {selectedSatellite.name}
                    </h2>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                      NORAD #{selectedSatellite.id}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      trigger("light");
                      onSelect(null);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--radius-interactive)",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--surface-border)",
                      color: "var(--text-primary)",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  >
                    DESELECT
                  </button>
                </div>

                <MobileDopplerCard satelliteObj={selectedSatellite} observer={observer} />
                <MobilePassCard satelliteObj={selectedSatellite} observer={observer} />
                <MobileDecayCard satelliteObj={selectedSatellite} altitudeKm={telemetry ? telemetry.alt : null} />
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "70%",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                    border: "1px dashed var(--surface-border)",
                  }}
                >
                  <ShieldAlert size={28} style={{ color: "var(--text-muted)" }} />
                </div>
                <h3 style={{ fontSize: "16px", margin: "0 0 8px 0", color: "var(--text-primary)" }}>
                  No Active Telemetry Target
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 20px 0", maxWidth: "240px" }}>
                  Please select a satellite from the Map or search database to initialize calculations.
                </p>
                <button
                  onClick={() => {
                    trigger("light");
                    setIsSearchOpen(true);
                  }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "var(--radius-interactive)",
                    backgroundColor: "var(--primary-uplink)",
                    color: "var(--bg-space)",
                    border: "none",
                    fontWeight: "bold",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Open Database
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Persistent Bottom Tab Bar */}
      <BottomNavigation activeView={activeView} onViewChange={onViewChange} />

      {/* Global Search overlay */}
      <MobileSearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        objects={objects}
        onSelect={onSelect}
      />
    </div>
  );
};

export default memo(MobileAppShell);
