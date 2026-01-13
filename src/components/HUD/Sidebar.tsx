"use client";

import React, { useState, useEffect, useRef, useMemo, memo } from "react";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";
import { Search, Globe, Satellite, Filter, ChevronLeft, ChevronRight, BarChart3, X, Menu, Star, Rocket, Navigation, Radio, Trash2, Sparkles, Activity } from "lucide-react";
import { clsx } from "clsx";
import { SpaceObject } from "@/lib/space-objects";
import StatsPanel from "./StatsPanel";
import { useTranslations } from "@/hooks/useLocale";
import { GlassPanel } from "@/components/UI/GlassPanel";

/**
 * Sidebar / ObjectCatalog - Satellite catalog and filtering
 * ORBITAL GLASS 2.0 - Floating card design on desktop, bottom sheet on mobile
 */

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
    { id: "ALL", label: "All", icon: Globe },
    { id: "LEO", label: "LEO", icon: Satellite },
    { id: "MEO", label: "MEO", icon: Activity },
    { id: "GEO", label: "GEO", icon: Satellite },
    { id: "HEO", label: "HEO", icon: Sparkles },
    { id: "STARLINK", label: "Starlink", icon: Rocket },
    { id: "GPS", label: "GNSS", icon: Navigation },
    { id: "ISS", label: "Stations", icon: Radio },
    { id: "DEBRIS", label: "Debris", icon: Trash2 },
  ];

  const highlightMatch = (text: string, query: string) => {
    if (!query || query.length < 2) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-sky-400/30 text-sky-300 px-0.5 rounded">{part}</span>
      ) : part
    );
  };

  const satellitesData = useMemo(() => {
    return objects.filter(o => o.type === 'TLE' && o.tle).map(o => ({
      ...o.tle!,
      id: o.id,
      name: o.name
    }));
  }, [objects]);

  const filteredObjects = useMemo(() => {
    if (!Array.isArray(objects)) return [];

    return objects.filter(obj => {
      const name = obj.name.toUpperCase();
      const id = obj.id;

      if (localSearch && !name.includes(localSearch) && !id.includes(localSearch)) return false;

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

  const handleDragEnd = (_: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 500 || offset > 100) {
      if (sheetHeight === 'full') setSheetHeight('half');
      else if (sheetHeight === 'half') setSheetHeight('collapsed');
    } else if (velocity < -500 || offset < -100) {
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

  const sidebarContent = (
    <>
      {/* Search */}
      <div className={clsx("p-4", isMobile ? "pb-2" : "p-4 pb-2")}>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors z-10" size={16} strokeWidth={1.5} />
          <input
            type="text"
            placeholder={t('sidebar.search')}
            aria-label="Search satellites by name or NORAD ID"
            className={clsx(
              "w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50 focus:bg-white/10 transition-all placeholder:text-slate-600",
              isMobile && "touch-target"
            )}
            value={localSearch}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setLocalSearch(val);
              onSearch(val);
            }}
          />

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {localSearch.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 right-0 mt-2 glass-panel-elevated rounded-xl overflow-hidden z-50"
              >
                <div className="p-2 border-b border-white/5">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                    {filteredObjects.length} results
                  </span>
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {filteredObjects.slice(0, 20).map(obj => (
                    <button
                      key={obj.id}
                      onClick={() => {
                        onSelect && onSelect(obj);
                        setLocalSearch("");
                        if (isMobile) setSheetHeight('collapsed');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 border-b border-white/5 last:border-b-0 transition-all group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 flex-shrink-0">
                        <Satellite size={12} className="text-sky-400" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 text-left overflow-hidden">
                        <div className="text-sm text-slate-200 truncate group-hover:text-sky-300">
                          {highlightMatch(obj.name, localSearch)}
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono">
                          {obj.id}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-600 group-hover:text-sky-400 transition-colors" strokeWidth={1.5} />
                    </button>
                  ))}
                  {filteredObjects.length === 0 && (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      No satellites found
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Filters & List */}
      <div className={clsx(
        "flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar touch-scroll",
        isMobile && "hide-scrollbar"
      )} ref={contentRef}>

        {/* Statistics Panel (Desktop only) */}
        {!isMobile && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[10px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={10} strokeWidth={1.5} />
                {t('sidebar.statistics')}
              </h2>
              <button
                onClick={() => setShowStats(!showStats)}
                className="text-[10px] text-slate-500 hover:text-sky-400 transition-colors"
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
        {!isMobile && <div className="h-px bg-white/5"></div>}

        {/* Filters */}
        {isMobile ? (
          <div className="overflow-x-auto hide-scrollbar -mx-4 px-4">
            <div className="flex gap-2 pb-2">
              {favorites.length > 0 && (
                <button
                  onClick={() => { setActiveFilter("FAVORITES"); onFilterChange("FAVORITES"); }}
                  className={clsx(
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border whitespace-nowrap touch-target",
                    activeFilter === "FAVORITES"
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      : "bg-white/5 text-slate-400 border-transparent"
                  )}
                >
                  <Star size={12} strokeWidth={1.5} /> Favorites
                </button>
              )}
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setActiveFilter(f.id); onFilterChange(f.id); }}
                  className={clsx(
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border whitespace-nowrap touch-target",
                    activeFilter === f.id
                      ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                      : "bg-white/5 text-slate-400 border-transparent"
                  )}
                >
                  <f.icon size={12} strokeWidth={1.5} />
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Categories (Desktop) */}
            <div>
              <h2 className="text-[10px] font-medium text-slate-500 uppercase mb-2 tracking-wider flex items-center gap-2">
                <Filter size={10} strokeWidth={1.5} />
                Categories
              </h2>
              <div className="grid grid-cols-1 gap-1.5">
                {favorites.length > 0 && (
                  <button
                    onClick={() => { setActiveFilter("FAVORITES"); onFilterChange("FAVORITES"); }}
                    className={clsx(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-sm font-medium",
                      activeFilter === "FAVORITES"
                        ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        : "bg-white/[0.02] text-slate-400 border border-transparent hover:bg-white/5 hover:text-slate-200"
                    )}
                  >
                    <Star size={14} className={activeFilter === "FAVORITES" ? "text-amber-400" : "text-slate-500"} strokeWidth={1.5} />
                    Favorites ({favorites.length})
                    {activeFilter === "FAVORITES" && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400"></div>}
                  </button>
                )}
                {filters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setActiveFilter(f.id); onFilterChange(f.id); }}
                    className={clsx(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-sm font-medium",
                      activeFilter === f.id
                        ? "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                        : "bg-white/[0.02] text-slate-400 border border-transparent hover:bg-white/5 hover:text-slate-200"
                    )}
                  >
                    <f.icon size={14} className={activeFilter === f.id ? "text-sky-400" : "text-slate-500"} strokeWidth={1.5} />
                    {f.label}
                    {activeFilter === f.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400"></div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Regions */}
            <div>
              <h2 className="text-[10px] font-medium text-slate-500 uppercase mb-2 tracking-wider flex items-center gap-2">
                <Globe size={10} strokeWidth={1.5} />
                Regions
              </h2>
              <div className="grid grid-cols-3 gap-1.5">
                {['USA', 'RU', 'CN', 'EU', 'TR', 'IN'].map((c, i) => {
                  const fullNames = ['USA', 'RUSSIA', 'CHINA', 'EU', 'TURKEY', 'INDIA'];
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        const filterId = `COUNTRY_${fullNames[i]}`;
                        setActiveFilter(filterId);
                        onFilterChange(filterId);
                      }}
                      className={clsx(
                        "text-[10px] font-medium py-1.5 rounded-lg transition-all",
                        activeFilter === `COUNTRY_${fullNames[i]}`
                          ? "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                          : "bg-white/[0.02] text-slate-500 border border-transparent hover:bg-white/5 hover:text-slate-300"
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-white/5"></div>
          </>
        )}

        {/* Results List */}
        <div className={isMobile ? "pt-0" : "pt-1"}>
          <h2 className="text-[10px] font-medium text-slate-500 uppercase mb-2 tracking-wider flex justify-between items-center">
            <span>Objects</span>
            <span className="bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded text-[10px] border border-sky-500/20">
              {filteredObjects.length}
            </span>
          </h2>
          <div className="space-y-1.5">
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
                  className={clsx(
                    "w-full group flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-sky-500/20 transition-all",
                    isMobile && "touch-target"
                  )}
                >
                  {/* Icon */}
                  <div className={clsx(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border",
                    isStarlink ? "bg-blue-500/10 border-blue-500/20" :
                      isISS ? "bg-violet-500/10 border-violet-500/20" :
                        isDebris ? "bg-rose-500/10 border-rose-500/20" :
                          "bg-sky-500/10 border-sky-500/20"
                  )}>
                    <Satellite size={14} className={clsx(
                      isStarlink ? "text-blue-400" :
                        isISS ? "text-violet-400" :
                          isDebris ? "text-rose-400" :
                            "text-sky-400"
                    )} strokeWidth={1.5} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left overflow-hidden min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isFavorite && (
                        <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0" strokeWidth={1.5} />
                      )}
                      <span className="text-sm text-slate-200 truncate group-hover:text-sky-300 transition-colors">
                        {obj.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-600 font-mono">
                        {obj.id}
                      </span>
                      {isStarlink && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          STARLINK
                        </span>
                      )}
                      {isISS && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          STATION
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={14} className="text-slate-700 group-hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" strokeWidth={1.5} />
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
        {/* FAB */}
        <AnimatePresence>
          {sheetHeight === 'collapsed' && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={() => setSheetHeight('half')}
              className="fab bottom-6 left-6 glass-panel-elevated text-sky-400"
            >
              <Menu size={22} strokeWidth={1.5} />
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
              className="bottom-sheet glass-panel-elevated z-40 flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
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
                  <h1 className="font-heading text-base tracking-widest text-white">
                    ORBIT<span className="text-sky-400">VIEW</span>
                  </h1>
                  <div className="text-[9px] text-slate-500 tracking-wider font-data">SATELLITE CATALOG</div>
                </div>
                <button
                  onClick={() => setSheetHeight('collapsed')}
                  className="p-2 glass-button rounded-lg text-slate-400 hover:text-white touch-target"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              {sidebarContent}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop Floating Card
  return (
    <>
      {/* Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed top-20 left-4 z-20 p-3 glass-panel-elevated rounded-xl text-sky-400 hover:text-white transition-colors"
          >
            <Filter size={18} strokeWidth={1.5} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-20 left-4 bottom-32 w-[320px] z-10"
          >
            <GlassPanel
              variant="elevated"
              className="h-full flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                <div>
                  <h1 className="font-heading text-lg tracking-widest text-white">
                    ORBIT<span className="text-sky-400">VIEW</span>
                  </h1>
                  <div className="text-[9px] text-slate-500 tracking-wider font-data">SATELLITE CATALOG</div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 glass-button rounded-lg text-slate-400 hover:text-white"
                >
                  <ChevronLeft size={16} strokeWidth={1.5} />
                </button>
              </div>

              {sidebarContent}
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default memo(Sidebar);
