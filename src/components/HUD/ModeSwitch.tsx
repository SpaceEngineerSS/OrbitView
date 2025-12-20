"use client";

import React from "react";
import { motion } from "framer-motion";
import { Eye, FlaskConical } from "lucide-react";
import { clsx } from "clsx";
import { AppMode } from "@/hooks/useAnalystMode";

interface ModeSwitchProps {
    mode: AppMode;
    onToggle: () => void;
}

const ModeSwitch: React.FC<ModeSwitchProps> = ({ mode, onToggle }) => {
    const isAnalyst = mode === 'analyst';

    return (
        <button
            onClick={onToggle}
            className={clsx(
                "relative flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300",
                isAnalyst
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
            )}
            title={`Switch to ${isAnalyst ? 'Observer' : 'Analyst'} Mode (A)`}
        >
            {/* Animated Icon */}
            <motion.div
                key={mode}
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.3, type: "spring" }}
            >
                {isAnalyst ? (
                    <FlaskConical size={18} className="text-purple-400" />
                ) : (
                    <Eye size={18} />
                )}
            </motion.div>

            {/* Label */}
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                {isAnalyst ? 'Analyst' : 'Observer'}
            </span>

            {/* Glow effect for analyst mode */}
            {isAnalyst && (
                <motion.div
                    className="absolute inset-0 rounded-xl bg-purple-500/10"
                    animate={{
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            )}
        </button>
    );
};

export default ModeSwitch;
