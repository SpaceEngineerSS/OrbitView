"use client";

import React, { memo } from "react";
import { Globe, BarChart2, Settings } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";

interface BottomNavigationProps {
  activeView: "globe" | "analytics" | "settings";
  onViewChange: (view: "globe" | "analytics" | "settings") => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeView,
  onViewChange,
}) => {
  const { trigger } = useHaptic();

  const handleTabClick = (view: "globe" | "analytics" | "settings") => {
    trigger("light");
    onViewChange(view);
  };

  return (
    <nav className="vanilla-bottom-nav pointer-events-auto">
      <button
        onClick={() => handleTabClick("globe")}
        className={`vanilla-nav-item ${activeView === "globe" ? "active" : ""}`}
        aria-label="Map View"
      >
        <Globe size={20} className="vanilla-nav-icon" />
        <span>MAP</span>
      </button>

      <button
        onClick={() => handleTabClick("analytics")}
        className={`vanilla-nav-item ${activeView === "analytics" ? "active" : ""}`}
        aria-label="Analytics View"
      >
        <BarChart2 size={20} className="vanilla-nav-icon" />
        <span>ANALYTICS</span>
      </button>

      <button
        onClick={() => handleTabClick("settings")}
        className={`vanilla-nav-item ${activeView === "settings" ? "active" : ""}`}
        aria-label="Settings View"
      >
        <Settings size={20} className="vanilla-nav-icon" />
        <span>SETTINGS</span>
      </button>
    </nav>
  );
};

export default memo(BottomNavigation);
