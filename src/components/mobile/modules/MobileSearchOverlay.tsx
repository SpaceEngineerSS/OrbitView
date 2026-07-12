"use client";

import React, { memo, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, X, Satellite } from "lucide-react";
import { SpaceObject } from "@/lib/space-objects";
import { useHaptic } from "@/hooks/useHaptic";

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  objects: SpaceObject[];
  onSelect: (obj: SpaceObject) => void;
}

const MobileSearchOverlay: React.FC<MobileSearchOverlayProps> = ({
  isOpen,
  onClose,
  objects,
  onSelect,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { trigger } = useHaptic();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Filter list
  const filteredObjects = useMemo(() => {
    if (!query || query.length < 2) {
      return objects.slice(0, 15); // Show first 15 when query is empty
    }
    const q = query.toUpperCase();
    return objects
      .filter((obj) => obj.name.toUpperCase().includes(q) || obj.id.includes(q))
      .slice(0, 40);
  }, [objects, query]);

  const handleSatelliteSelect = useCallback(
    (sat: SpaceObject) => {
      trigger("medium");
      onSelect(sat);
      onClose();
    },
    [onSelect, onClose, trigger]
  );

  if (!isOpen) return null;

  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) return text;
    const regex = new RegExp(`(${searchQuery})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} style={{ color: "var(--primary-uplink)", fontWeight: "bold" }}>
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        background: "rgba(3, 3, 5, 0.95)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        display: "flex",
        flexDirection: "column",
        padding: "env(safe-area-inset-top, 20px) 16px env(safe-area-inset-bottom, 20px) 16px",
        boxSizing: "border-box",
      }}
      className="pointer-events-auto"
    >
      {/* Header input bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          borderBottom: "1px solid var(--surface-border)",
          paddingBottom: "12px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              color: "var(--text-muted)",
            }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Satellites or NORAD IDs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              height: "44px",
              paddingLeft: "40px",
              paddingRight: "12px",
              borderRadius: "var(--radius-interactive)",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--surface-border)",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <button
          onClick={() => {
            trigger("light");
            onClose();
          }}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "var(--radius-pill)",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--surface-border)",
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Results List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <h3
          style={{
            fontSize: "10px",
            fontWeight: "bold",
            color: "var(--text-muted)",
            letterSpacing: "0.05em",
            marginBottom: "12px",
            textTransform: "uppercase",
          }}
        >
          {query.length >= 2 ? "Search Results" : "Featured Satellites"}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filteredObjects.map((obj) => (
            <div
              key={obj.id}
              onClick={() => handleSatelliteSelect(obj)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px",
                borderRadius: "var(--radius-interactive)",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--surface-border)",
                cursor: "pointer",
                transition: "border-color var(--transition-fast)",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(0, 243, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--surface-border)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-pill)",
                    backgroundColor: "rgba(0, 243, 255, 0.05)",
                    border: "1px solid rgba(0, 243, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary-uplink)",
                  }}
                >
                  <Satellite size={16} />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}>
                    {highlightMatch(obj.name, query)}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                    #{obj.id}
                  </span>
                </div>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--primary-uplink)",
                  border: "1px solid rgba(0, 243, 255, 0.2)",
                  borderRadius: "var(--radius-pill)",
                  padding: "2px 8px",
                  fontWeight: "bold",
                }}
              >
                SELECT
              </span>
            </div>
          ))}

          {filteredObjects.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              No satellites found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(MobileSearchOverlay);
