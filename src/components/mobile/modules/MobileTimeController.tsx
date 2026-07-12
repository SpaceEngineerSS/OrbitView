"use client";

import React, { memo } from "react";
import { Play, Pause, FastForward, RotateCcw } from "lucide-react";
import { useTimelineStore } from "@/store/timelineStore";
import { useHaptic } from "@/hooks/useHaptic";

interface MobileTimeControllerProps {
  isVisible: boolean;
}

const speedOptions = [1, 10, 100];

const MobileTimeController: React.FC<MobileTimeControllerProps> = ({ isVisible }) => {
  const { isPlaying, multiplier, togglePlay, setMultiplier, resetToNow } = useTimelineStore();
  const { trigger } = useHaptic();

  if (!isVisible) return null;

  const handlePlayPause = () => {
    trigger("medium");
    togglePlay();
  };

  const handleSpeedCycle = () => {
    trigger("light");
    const currentIndex = speedOptions.indexOf(multiplier);
    const nextIndex = (currentIndex + 1) % speedOptions.length;
    setMultiplier(speedOptions[nextIndex]);
  };

  const handleReset = () => {
    trigger("heavy");
    resetToNow();
  };

  return (
    <div className="vanilla-time-scrubber pointer-events-auto">
      {/* Reset to Now */}
      <button
        onClick={handleReset}
        className="vanilla-scrubber-btn"
        aria-label="Reset to Now"
      >
        <RotateCcw size={18} />
      </button>

      {/* Speed Control */}
      <button
        onClick={handleSpeedCycle}
        className={`vanilla-scrubber-btn ${multiplier > 1 ? "active" : ""}`}
        aria-label="Cycle Playback Speed"
      >
        <div style={{ position: "relative" }}>
          <FastForward size={18} />
          {multiplier > 1 && (
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-8px",
                fontSize: "8px",
                fontWeight: "bold",
                backgroundColor: "var(--primary-uplink)",
                color: "var(--bg-space)",
                padding: "1px 2px",
                borderRadius: "3px",
              }}
            >
              {multiplier}x
            </span>
          )}
        </div>
      </button>

      {/* Play/Pause */}
      <button
        onClick={handlePlayPause}
        className={`vanilla-scrubber-btn ${isPlaying ? "active" : ""}`}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: "2px" }} />}
      </button>
    </div>
  );
};

export default memo(MobileTimeController);
