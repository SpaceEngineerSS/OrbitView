"use client";

import React, { useState, useEffect, useRef, useMemo, memo } from "react";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import { Search, Globe, Satellite, Filter, ShieldAlert, ChevronLeft, ChevronRight, BarChart3, X, Menu, Star, Rocket, Navigation, Radio, Trash2, Sparkles, Activity } from "lucide-react";
import { clsx } from "clsx";
import { SpaceObject } from "@/lib/space-objects";
import StatsPanel from "./StatsPanel";
import { useTranslations } from "@/hooks/useLocale";

interface SidebarProps {
  objects: SpaceObject[];
  onSearch: (query: string) => void;
  onFilterChange: (filter: string) => void;
  onSelect: (obj: SpaceObject) => void;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  objects = [],
  onSearch,
  onFilterChange,
  onSelect,
  favorites = [],
  onToggleFavorite
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [localSearch, setLocalSearch] = useState("");
  const [showStats, setShowStats] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [sheetHeight, setSheetHeight] = useState<'collapsed' | 'half' | 'full'>('collapsed');
  const dragControls = useDragControls();
  const contentRef = useRef<HTMLDivElement>(null);
  const t = useTranslations();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSheetHeight('collapsed');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filters = [
    { id: "ALL", label: "All Objects", icon: Globe, color: "cyan", emoji: "🌍" },
    { id: "LEO", label: "Low Earth (LEO)", icon: Satellite, color: "cyan", emoji: "🛰️" },
    { id: "MEO", label: "Medium Earth (MEO)", icon: Activity, color: "yellow", emoji: "🌐" },
    { id: "GEO", label: "Geostationary (GEO)", icon: Satellite, color: "orange", emoji: "🛰️" },
    { id: "HEO", label: "High Elliptical (HEO)", icon: Sparkles, color: "purple", emoji: "☄️" },
    { id: "STARLINK", label: "Starlink", icon: Rocket, color: "blue", emoji: "🚀" },
    { id: "GPS", label: "GPS / GNSS", icon: Navigation, color: "green", emoji: "📡" },
    { id: "ISS", label: "Space Stations", icon: Radio, color: "purple", emoji: "🛸" },
    { id: "DEBRIS", label: "Debris", icon: Trash2, color: "red", emoji: "⚠️" },
  ];



  const MISSION_METADATA: Record<string, { desc: string, type: string }> = {
    '25544': { desc: "The International Space Station - Humanity's laboratory in orbit.", type: "Space Station" },
    '20580': { desc: "Hubble Space Telescope - Witnessing the birth and death of stars.", type: "Telescope" },
    '43013': { desc: "Tiangong Space Station - China's multi-module space research station.", type: "Space Station" },
    '48274': { desc: "CSS (Tianhe-1) - The core module of the Tiangong space station.", type: "Core Module" },
    '4022': { desc: "AMSAT-OSCAR 7 - One of the oldest active communication satellites (1974).", type: "Classic Amateur" },
    '-31': { desc: "Voyager 1 - Currently 24 billion km from Earth in interstellar space.", type: "Interstellar Probe" },
    '-32': { desc: "Voyager 2 - Currently 20 billion km from Earth, exploring the heliopause.", type: "Interstellar Probe" },
    '-74': { desc: "MRO - Mapping Mars' surface in high resolution from orbit.", type: "Mars Orbiter" },
    '-98': { desc: "New Horizons - Exploring the Kuiper Belt after its 2015 Pluto flyby.", type: "Interstellar Probe" },
    '-96': { desc: "Parker Solar Probe - Studying the Sun's corona at record-breaking speeds.", type: "Solar Probe" }
  };

  // Helper function to highlight search matches
  const highlightMatch = (text: string, query: string) => {
    if (!query || query.length < 2) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-cyan-500/30 text-cyan-300 px-0.5 rounded">{part}</span>
      ) : part
    );
  };

  // Memoize satellites data for StatsPanel
  const satellitesData = useMemo(() => {
    return objects.filter(o => o.type === 'TLE' && o.tle).map(o => ({
      ...o.tle!,
      id: o.id,
      name: o.name
    }));
  }, [objects]);

  // Filter Logic - Memoized
  const filteredObjects = useMemo(() => {
    if (!Array.isArray(objects)) return [];

    return objects.filter(obj => {
      const name = obj.name.toUpperCase();
      const id = obj.id;

      // Search Query
      if (localSearch && !name.includes(localSearch) && !id.includes(localSearch)) return false;

      // Category Filter
      if (activeFilter === "ALL") return true;
      if (activeFilter === "FAVORITES") return favorites.includes(obj.id);
      if (activeFilter.startsWith("COUNTRY_")) {
        const country = activeFilter.replace("COUNTRY_", "");
        if (country === "USA" && !name.includes("USA") && !name.includes("US") && !name.includes("NAVSTAR") && !name.includes("GOES") && !name.includes("NOAA")) return false;
        if (country === "RUSSIA" && !name.includes("COSMOS") && !name.includes("GLONASS") && !name.includes("SOYUZ") && !name.includes("PROGRESS") && !name.includes("ZARYA")) return false;
        if (country === "CHINA" && !name.includes("BEIDOU") && !name.includes("CZ") && !name.includes("SHIYAN") && !name.includes("YAOGAN") && !name.includes("TIANHE")) return false;
        if (country === "EU" && !name.includes("GALILEO") && !name.includes("SENTINEL") && !name.includes("ENVISAT")) return false;
        if (country === "TURKEY" && !name.includes("TURKSAT") && !name.includes("GOKTURK") && !name.includes("RASAT") && !name.includes("IMECE")) return false;
        if (country === "INDIA" && !name.includes("INSAT") && !name.includes("GSAT") && !name.includes("IRS") && !name.includes("CARTOSAT")) return false;
        return true;
      }
      if (activeFilter === "DEEP_SPACE" && obj.type !== "EPHEMERIS") return false;
      if (activeFilter === "LEO" && obj.category !== "LEO") return false;
      if (activeFilter === "STARLINK" && !name.includes("STARLINK")) return false;
      if (activeFilter === "GPS" && !name.includes("GPS") && !name.includes("NAVSTAR") && !name.includes("GLONASS") && !name.includes("GALILEO") && !name.includes("BEIDOU")) return false;
      if (activeFilter === "GEO" && obj.category !== "GEO") return false;
      if (activeFilter === "MEO" && obj.category !== "MEO") return false;
      if (activeFilter === "HEO" && obj.category !== "HEO") return false;
      if (activeFilter === "ISS" && !name.includes("ISS") && !name.includes("ZARYA")) return false;
      if (activeFilter === "DEBRIS" && obj.category !== "DEBRIS") return false;

      return true;
    });
  }, [objects, localSearch, activeFilter, favorites]);

  // Handle drag for mobile bottom sheet
  const handleDragEnd = (_: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 500 || offset > 100) {
      // Dragging down fast
      if (sheetHeight === 'full') setSheetHeight('half');
      else if (sheetHeight === 'half') setSheetHeight('collapsed');
    } else if (velocity < -500 || offset < -100) {
      // Dragging up fast
      if (sheetHeight === 'collapsed') setSheetHeight('half');
      else if (sheetHeight === 'half') setSheetHeight('full');
    }
  };

  const getSheetHeightValue = () => {
    switch (sheetHeight) {
      case 'full': return 'calc(85vh - env(safe-area-inset-bottom))';
      case 'half': return '50vh';
      case 'collapsed': return '0px';
    }
  };

  // Sidebar Content JSX (shared between desktop and mobile)
  // Using JSX variable instead of inline component to preserve scroll position
  const sidebarContent = (
    <>
      {/* Search */}
      <div className={clsx("p-4", isMobile ? "pb-2" : "p-5 pb-2")}>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors z-10" size={18} />
          <input
            type="text"
            placeholder={t('sidebar.search')}
            aria-label="Search satellites by name or NORAD ID"
            role="searchbox"
            autoComplete="off"
            className={clsx(
              "w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:bg-black/60 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all placeholder:text-slate-600",
              isMobile && "touch-target"
            )}
            value={localSearch}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setLocalSearch(val);
              onSearch(val);
            }}
          />

          {/* Search Dropdown Results */}
          {localSearch.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden z-50"
            >
              <div className="p-2 border-b border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {filteredObjects.length} results for "{localSearch}"
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                {filteredObjects.slice(0, 20).map(obj => (
                  <button
                    key={obj.id}
                    onClick={() => {
                      onSelect && onSelect(obj);
                      setLocalSearch(""); // Clear search after selection
                      if (isMobile) setSheetHeight('collapsed');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cyan-500/10 border-b border-white/5 last:border-b-0 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30 flex-shrink-0">
                      <Satellite size={14} className="text-cyan-400" />
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <div className="text-sm text-slate-200 font-medium truncate group-hover:text-cyan-300">
                        {highlightMatch(obj.name, localSearch)}
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono">
                        NORAD ID: {highlightMatch(obj.id, localSearch)}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-700 group-hover:text-cyan-500 transition-colors" />
                  </button>
                ))}
                {filteredObjects.length === 0 && (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    No satellites found
                  </div>
                )}
                {filteredObjects.length > 20 && (
                  <div className="p-2 text-center text-[10px] text-cyan-500/70 border-t border-white/5">
                    +{filteredObjects.length - 20} more results in list below
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Filters & List */}
      <div className={clsx(
        "flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar touch-scroll",
        isMobile && "hide-scrollbar"
      )} ref={contentRef}>

        {/* Statistics Panel */}
        {!isMobile && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={12} aria-hidden="true" />
                {t('sidebar.statistics')}
              </h2>
              <button
                onClick={() => setShowStats(!showStats)}
                className="text-[10px] text-slate-500 hover:text-cyan-400 transition-colors"
                aria-label={showStats ? "Hide Statistics" : "Show Statistics"}
                aria-expanded={showStats}
              >
                {showStats ? "Hide" : "Show"}
              </button>
            </div>
            <AnimatePresence>
              {showStats && <StatsPanel satellites={satellitesData} />}
            </AnimatePresence>
          </div>
        )}

        {/* Divider */}
        {!isMobile && <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>}

        {/* Quick Filters (Mobile Horizontal Scroll) */}
        {isMobile ? (
          <div className="overflow-x-auto hide-scrollbar -mx-4 px-4">
            <div className="flex gap-2 pb-2">
              {favorites.length > 0 && (
                <button
                  onClick={() => { setActiveFilter("FAVORITES"); onFilterChange("FAVORITES"); }}
                  className={clsx(
                    "flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold border whitespace-nowrap touch-target",
                    activeFilter === "FAVORITES"
                      ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
                      : "bg-white/5 text-slate-400 border-transparent"
                  )}
                >
                  <Star size={14} /> Favorites
                </button>
              )}
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setActiveFilter(f.id); onFilterChange(f.id); }}
                  aria-label={`Filter by ${f.label}`}
                  aria-pressed={activeFilter === f.id}
                  className={clsx(
                    "flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold border whitespace-nowrap touch-target",
                    activeFilter === f.id
                      ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/40"
                      : "bg-white/5 text-slate-400 border-transparent"
                  )}
                >
                  <f.icon size={14} aria-hidden="true" />
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Main Filters (Desktop) */}
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider flex items-center gap-2">
                <Filter size={12} />
                Categories
              </h2>
              <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Satellite category filter">
                {favorites.length > 0 && (
                  <button
                    onClick={() => { setActiveFilter("FAVORITES"); onFilterChange("FAVORITES"); }}
                    role="radio"
                    aria-checked={activeFilter === "FAVORITES"}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium border",
                      activeFilter === "FAVORITES"
                        ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/40 shadow-[0_0_10px_rgba(234,179,8,0.1)]"
                        : "bg-white/5 text-slate-400 border-transparent hover:bg-white/10 hover:text-slate-200"
                    )}
                  >
                    <Star size={18} className={activeFilter === "FAVORITES" ? "text-yellow-400" : "text-slate-500"} />
                    Favorites ({favorites.length})
                    {activeFilter === "FAVORITES" && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_5px_yellow]"></div>}
                  </button>
                )}
                {filters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setActiveFilter(f.id); onFilterChange(f.id); }}
                    role="radio"
                    aria-checked={activeFilter === f.id}
                    aria-label={`Filter by ${f.label}`}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium border backdrop-blur-md",
                      activeFilter === f.id
                        ? f.id === "FEATURED"
                          ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.15)]"
                          : "bg-cyan-500/10 text-cyan-300 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                        : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-slate-200 hover:border-white/20"
                    )}
                  >
                    <f.icon size={18} className={clsx(
                      activeFilter === f.id
                        ? f.id === "FEATURED" ? "text-yellow-400" : "text-cyan-400"
                        : "text-slate-500"
                    )} aria-hidden="true" />
                    {f.label}
                    {f.id === "FEATURED" && (
                      <span className="ml-2 text-[8px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                        NEW
                      </span>
                    )}
                    {activeFilter === f.id && (
                      <div className={clsx(
                        "ml-auto w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]",
                        f.id === "FEATURED" ? "bg-yellow-400 text-yellow-400" : "bg-cyan-400 text-cyan-400"
                      )}></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Region Filter */}
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider flex items-center gap-2">
                <Globe size={12} />
                Regions
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {['USA', 'RUSSIA', 'CHINA', 'EU', 'TURKEY', 'INDIA'].map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      const filterId = `COUNTRY_${c}`;
                      setActiveFilter(filterId);
                      onFilterChange(filterId);
                    }}
                    className={clsx(
                      "text-[10px] font-bold py-2 rounded-md transition-all border",
                      activeFilter === `COUNTRY_${c}`
                        ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/40"
                        : "bg-white/5 text-slate-500 border-transparent hover:bg-white/10 hover:text-slate-300"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          </>
        )}

        {/* Results List */}
        <div className={isMobile ? "pt-0" : "pt-2"}>
          <h2 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider flex justify-between items-center">
            {activeFilter === "FEATURED" && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
                <p className="text-[10px] text-yellow-300/80 leading-relaxed italic">
                  Exploring Humanity's most significant orbital assets. These missions push the boundaries of science and communication.
                </p>
              </div>
            )}
            <span>Objects</span>
            <span className="bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded text-[10px] border border-cyan-500/20">
              {filteredObjects.length}
            </span>
          </h2>
          <div className="space-y-2" role="list" aria-label="Satellite list">
            {filteredObjects.slice(0, isMobile ? 50 : 100).map(obj => {
              const isFavorite = favorites.includes(obj.id);
              const isStarlink = obj.name.toUpperCase().includes('STARLINK');
              const isISS = obj.name.toUpperCase().includes('ISS') || obj.name.toUpperCase().includes('ZARYA');
              const isDebris = obj.name.toUpperCase().includes('DEBRIS') || obj.name.toUpperCase().includes('ROCKET BODY');

              return (
                <button
                  key={obj.id}
                  onClick={() => {
                    onSelect && onSelect(obj);
                    if (isMobile) setSheetHeight('collapsed');
                  }}
                  role="listitem"
                  aria-label={`View details for ${obj.name}`}
                  className={clsx(
                    "w-full group flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-cyan-500/30 transition-all",
                    isMobile && "touch-target"
                  )}
                >
                  {/* Satellite Icon */}
                  <div className={clsx(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border",
                    isStarlink ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30" :
                      isISS ? "bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30" :
                        isDebris ? "bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30" :
                          "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30"
                  )}>
                    <Satellite size={18} className={clsx(
                      isStarlink ? "text-blue-400" :
                        isISS ? "text-purple-400" :
                          isDebris ? "text-red-400" :
                            "text-cyan-400"
                    )} aria-hidden="true" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left overflow-hidden min-w-0">
                    <div className="flex items-center gap-2">
                      {isFavorite && (
                        <Star size={12} className="text-yellow-400 fill-yellow-400 flex-shrink-0" aria-label="Favorited" />
                      )}
                      <span className="text-sm text-slate-200 font-medium truncate group-hover:text-cyan-300 transition-colors">
                        {obj.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-600 font-mono group-hover:text-cyan-600">
                        {obj.id}
                      </span>
                      {isStarlink && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          STARLINK
                        </span>
                      )}
                      {isISS && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          STATION
                        </span>
                      )}
                      {activeFilter === "FEATURED" && MISSION_METADATA[obj.id] && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                          {MISSION_METADATA[obj.id].type}
                        </span>
                      )}
                    </div>
                    {activeFilter === "FEATURED" && MISSION_METADATA[obj.id] && (
                      <p className="text-[9px] text-slate-500 mt-1 line-clamp-1 italic group-hover:text-slate-400">
                        {MISSION_METADATA[obj.id].desc}
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronRight size={16} className="text-slate-700 group-hover:text-cyan-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 flex-shrink-0" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );

  // Mobile Bottom Sheet
  if (isMobile) {
    return (
      <>
        {/* Mobile FAB to open sheet */}
        <AnimatePresence>
          {sheetHeight === 'collapsed' && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={() => setSheetHeight('half')}
              className="fab bottom-6 left-6 bg-slate-950/90 border border-cyan-500/30 text-cyan-400"
            >
              <Menu size={24} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Backdrop */}
        <AnimatePresence>
          {sheetHeight !== 'collapsed' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overlay-backdrop z-30"
              onClick={() => setSheetHeight('collapsed')}
            />
          )}
        </AnimatePresence>

        {/* Bottom Sheet */}
        <AnimatePresence>
          {sheetHeight !== 'collapsed' && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0, height: getSheetHeightValue() }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="bottom-sheet bg-slate-950/95 backdrop-blur-xl border-t border-white/10 z-40 flex flex-col"
            >
              {/* Drag Handle */}
              <div
                className="flex-shrink-0 cursor-grab active:cursor-grabbing py-3"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="bottom-sheet-handle" />
              </div>

              {/* Header */}
              <div className="flex-shrink-0 px-4 pb-3 flex items-center justify-between border-b border-white/5">
                <div>
                  <h1 className="font-bold text-lg tracking-widest text-white flex items-center gap-2">
                    ORBIT<span className="text-cyan-400">VIEW</span>
                  </h1>
                  <div className="text-[9px] text-cyan-500/70 tracking-[0.15em] font-mono">SATELLITE TRACKING</div>
                </div>
                <button
                  onClick={() => setSheetHeight('collapsed')}
                  className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors touch-target"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              {sidebarContent}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <>
      {/* Toggle Button (Visible when closed) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setIsOpen(true)}
            className="fixed top-6 left-6 z-30 p-3 bg-slate-950/90 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-950/50 hover:border-cyan-400/50 transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-md group"
          >
            <Filter size={20} className="group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: -350 }}
        animate={{ x: isOpen ? 0 : -350 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 h-full w-[340px] bg-slate-950/80 backdrop-blur-xl border-r border-white/10 text-slate-100 z-20 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-cyan-950/30 to-transparent">
          <div>
            <h1 className="font-bold text-2xl tracking-widest text-white flex items-center gap-2">
              ORBIT<span className="text-cyan-400">VIEW</span>
            </h1>
            <div className="text-[10px] text-cyan-500/70 tracking-[0.2em] font-mono mt-1">SATELLITE TRACKING SYSTEM</div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Content */}
        {sidebarContent}
      </motion.div>
    </>
  );
};

export default memo(Sidebar);
