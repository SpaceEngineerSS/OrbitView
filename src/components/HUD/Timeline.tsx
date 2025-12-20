"use client";

import React, { useState, useEffect } from "react";
import { Play, Pause, Rewind, FastForward, Clock, Calendar, ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/hooks/useLocale";

interface TimelineProps {
   time: Date | null;
   onTimeChange?: (date: Date) => void;
   isPlaying?: boolean;
   onTogglePlay?: () => void;
   multiplier?: number;
   onMultiplierChange?: (val: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({
   time,
   onTimeChange = () => { },
   isPlaying = true,
   onTogglePlay = () => { },
   multiplier = 1,
   onMultiplierChange = () => { }
}) => {
   const [isMobile, setIsMobile] = useState(false);
   const [isExpanded, setIsExpanded] = useState(false);
   const t = useTranslations();

   useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
   }, []);

   if (!time) return null;

   const handleTimeChange = (ms: number) => {
      if (time) {
         onTimeChange(new Date(time.getTime() + ms));
      }
   };

   const handleReturnToNow = () => {
      onTimeChange(new Date());
   };

   // Mobile Compact Timeline
   if (isMobile) {
      return (
         <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="pointer-events-auto">
               {/* Expand button */}
               <AnimatePresence>
                  {!isExpanded && (
                     <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onClick={() => setIsExpanded(true)}
                        className="absolute bottom-4 right-4 bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg"
                     >
                        <Clock size={16} className="text-cyan-400" />
                        <span className="text-white font-mono text-sm">
                           {time.toISOString().split('T')[1].split('.')[0]}
                        </span>
                        <ChevronUp size={14} className="text-slate-400" />
                     </motion.button>
                  )}
               </AnimatePresence>

               {/* Expanded Controls */}
               <AnimatePresence>
                  {isExpanded && (
                     <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25 }}
                        className="bg-slate-950/95 backdrop-blur-xl border-t border-white/10 p-4"
                     >
                        {/* Close button */}
                        <button
                           onClick={() => setIsExpanded(false)}
                           className="absolute top-2 right-4 p-2 text-slate-400"
                        >
                           <ChevronDown size={20} />
                        </button>

                        {/* Time Display */}
                        <div className="flex items-center justify-center gap-3 mb-4">
                           <Calendar size={16} className="text-cyan-500" />
                           <div className="text-center">
                              <div className="text-cyan-50 font-mono text-xl tracking-widest tabular-nums">
                                 {time.toISOString().split('T')[1].split('.')[0]}
                              </div>
                              <div className="text-[10px] text-cyan-500/70 font-mono">
                                 {time.toISOString().split('T')[0]} UTC
                              </div>
                           </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-4 mb-4" role="toolbar" aria-label="Time controls">
                           <button
                              onClick={() => handleTimeChange(-3600000)}
                              aria-label="Rewind 1 hour"
                              className="p-3 hover:text-cyan-300 text-slate-400 transition-colors hover:bg-white/5 rounded-xl touch-target"
                           >
                              <Rewind size={20} />
                           </button>

                           <button
                              onClick={onTogglePlay}
                              aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
                              aria-pressed={isPlaying}
                              className={clsx(
                                 "p-5 rounded-2xl transition-all shadow-lg flex items-center justify-center touch-target",
                                 isPlaying
                                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                                    : "bg-white/10 text-white border border-white/10 hover:bg-white/20"
                              )}
                           >
                              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
                           </button>

                           <button
                              onClick={() => handleTimeChange(3600000)}
                              aria-label="Fast-forward 1 hour"
                              className="p-3 hover:text-cyan-300 text-slate-400 transition-colors hover:bg-white/5 rounded-xl touch-target"
                           >
                              <FastForward size={20} />
                           </button>
                        </div>

                        {/* Speed Multiplier */}
                        <div className="flex items-center justify-center gap-2">
                           {[1, 10, 100].map(m => (
                              <button
                                 key={m}
                                 onClick={() => onMultiplierChange(m)}
                                 className={clsx(
                                    "px-4 py-2 rounded-lg text-sm font-bold transition-all font-mono touch-target",
                                    multiplier === m
                                       ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                                       : "text-slate-500 hover:text-slate-300 bg-white/5"
                                 )}
                              >
                                 {m}x
                              </button>
                           ))}
                           <button
                              onClick={handleReturnToNow}
                              aria-label="Return to current time"
                              className="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 touch-target flex items-center gap-1.5"
                           >
                              <RotateCcw size={14} />
                              NOW
                           </button>
                        </div>
                     </motion.div>
                  )}
               </AnimatePresence>
            </div>
         </div>
      );
   }

   // Desktop Timeline
   return (
      <div className="fixed bottom-8 left-0 w-full flex justify-center items-end z-20 pointer-events-none">
         <div className="pointer-events-auto flex flex-col items-center gap-4">

            {/* Time Scrubber Visual */}
            <div className="w-[500px] h-6 relative flex items-center justify-center group opacity-50 hover:opacity-100 transition-opacity">
               <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
               <div className="absolute h-3 w-[1px] bg-cyan-400 top-1.5 shadow-[0_0_10px_cyan]"></div>
               {/* Ticks */}
               {[-4, -3, -2, -1, 1, 2, 3, 4].map(i => (
                  <div key={i} className="absolute h-1.5 w-[1px] bg-white/20" style={{ left: `calc(50% + ${i * 50}px)` }}></div>
               ))}
            </div>

            {/* Main Control Deck */}
            <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex items-center gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">

               {/* Time Display */}
               <div className="flex flex-col items-start px-4 py-1 border-r border-white/10 min-w-[160px]">
                  <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 tracking-wider mb-0.5">
                     <Calendar size={10} />
                     UTC TIME
                  </span>
                  <span className="text-cyan-50 font-mono text-lg tracking-widest tabular-nums">
                     {time.toISOString().split('T')[1].split('.')[0]}
                  </span>
                  <span className="text-[10px] text-cyan-500/70 font-mono">
                     {time.toISOString().split('T')[0]}
                  </span>
               </div>

               {/* Controls */}
               <div className="flex items-center gap-2" role="toolbar" aria-label="Time controls">
                  <button
                     onClick={() => handleTimeChange(-3600000)}
                     aria-label="Rewind 1 hour"
                     className="p-2.5 hover:text-cyan-300 text-slate-400 transition-colors hover:bg-white/5 rounded-xl"
                  >
                     <Rewind size={18} />
                  </button>

                  <button
                     onClick={onTogglePlay}
                     aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
                     aria-pressed={isPlaying}
                     className={clsx(
                        "p-4 rounded-xl transition-all shadow-lg flex items-center justify-center",
                        isPlaying
                           ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                           : "bg-white/10 text-white border border-white/10 hover:bg-white/20"
                     )}
                  >
                     {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                  </button>

                  <button
                     onClick={() => handleTimeChange(3600000)}
                     aria-label="Fast-forward 1 hour"
                     className="p-2.5 hover:text-cyan-300 text-slate-400 transition-colors hover:bg-white/5 rounded-xl"
                  >
                     <FastForward size={18} />
                  </button>
               </div>

               {/* Speed Multiplier */}
               <div className="flex items-center gap-1 pl-4 border-l border-white/10">
                  {[1, 10, 100].map(m => (
                     <button
                        key={m}
                        onClick={() => onMultiplierChange(m)}
                        className={clsx(
                           "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all font-mono",
                           multiplier === m
                              ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                        )}
                     >
                        {m}x
                     </button>
                  ))}
                  <button
                     onClick={handleReturnToNow}
                     aria-label="Return to current time"
                     title="Return to Now"
                     className="ml-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 flex items-center gap-1"
                  >
                     <RotateCcw size={12} />
                     NOW
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Timeline;
