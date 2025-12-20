"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Github, Linkedin, Globe, Mail, MapPin, Rocket, Cpu } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-slate-950/90 backdrop-blur-2xl border border-white/10 w-full max-w-3xl rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] relative"
          >
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors z-10 p-2 hover:bg-white/5 rounded-full"
            >
              <X size={20} />
            </button>

            <div className="p-12 flex flex-col md:flex-row gap-12 relative z-0">
              {/* Profile Side */}
              <div className="flex-shrink-0 flex flex-col items-center text-center md:items-start md:text-left">
                <div className="relative mb-8 group">
                  <div className="absolute inset-0 bg-cyan-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                  <div className="w-32 h-32 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center relative z-10 shadow-2xl">
                    <Rocket size={48} className="text-cyan-400" />
                  </div>
                  <div className="absolute bottom-0 right-0 bg-slate-900 border border-cyan-500/30 p-2 rounded-full text-cyan-400">
                    <Cpu size={16} />
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-white tracking-tight mb-2">MEHMET GÜMÜŞ</h2>
                <p className="text-cyan-400 font-medium text-sm mb-6 tracking-wide">Software & Embedded Systems Developer <br /> AI, Space & Defense Technologies</p>

                <div className="flex items-center gap-2 text-slate-400 text-sm mb-1 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                  <MapPin size={14} className="text-cyan-500" /> Istanbul, Türkiye
                </div>
              </div>

              {/* Details Side */}
              <div className="flex-1 space-y-8 border-t md:border-t-0 md:border-l border-white/10 pt-8 md:pt-0 md:pl-12">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-slate-700"></span>
                    Connect
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <a href="mailto:contact@spacegumus.com.tr" className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-white/10 transition-all group">
                      <div className="p-2 bg-black/40 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform"><Mail size={18} /></div>
                      <span className="text-sm text-slate-300 group-hover:text-white">contact@spacegumus.com.tr</span>
                    </a>
                    <a href="https://www.spacegumus.com.tr/" target="_blank" className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-white/10 transition-all group">
                      <div className="p-2 bg-black/40 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform"><Globe size={18} /></div>
                      <span className="text-sm text-slate-300 group-hover:text-white">www.spacegumus.com.tr</span>
                    </a>
                    <a href="https://github.com/SpaceEngineerSS" target="_blank" className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-white/10 transition-all group">
                      <div className="p-2 bg-black/40 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform"><Github size={18} /></div>
                      <span className="text-sm text-slate-300 group-hover:text-white">SpaceEngineerSS</span>
                    </a>
                    <a href="https://linkedin.com/in/mehmetgümüş" target="_blank" className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-white/10 transition-all group">
                      <div className="p-2 bg-black/40 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform"><Linkedin size={18} /></div>
                      <span className="text-sm text-slate-300 group-hover:text-white">mehmetgümüş</span>
                    </a>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono border-t border-white/10 pt-6">
                    <span>v2.0.0-ALPHA</span>
                    <span>CESIUM ION + REACT FIBER</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AboutModal;

