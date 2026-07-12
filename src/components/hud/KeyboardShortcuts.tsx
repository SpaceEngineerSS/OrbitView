"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";

const KeyboardShortcuts: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === "?" || (e.shiftKey && e.key === "/")) {
                setIsOpen(prev => !prev);
            }
            if (e.key === "Escape" && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [isOpen]);

    const shortcuts = [
        { keys: ["?"], description: "Show/hide this panel" },
        { keys: ["Space"], description: "Play/Pause time" },
        { keys: ["←", "→"], description: "Rewind/Forward 1 hour" },
        { keys: ["1", "2", "3"], description: "Set time speed (1x, 10x, 100x)" },
        { keys: ["F"], description: "Toggle filters panel" },
        { keys: ["I"], description: "Toggle info panel" },
        { keys: ["Esc"], description: "Close panels/Deselect" },
        { keys: ["S"], description: "Search satellites" },
    ];

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 left-6 p-3 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] group z-30"
                title="Keyboard Shortcuts (?)"
            >
                <Keyboard size={20} />
            </button>

            {/* Shortcuts Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-[0_0_100px_rgba(0,0,0,0.8)]"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Keyboard size={28} className="text-cyan-400" />
                                    Keyboard Shortcuts
                                </h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {shortcuts.map((shortcut, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-colors"
                                    >
                                        <span className="text-slate-300 text-sm">{shortcut.description}</span>
                                        <div className="flex gap-2">
                                            {shortcut.keys.map((key, keyIdx) => (
                                                <kbd
                                                    key={keyIdx}
                                                    className="px-3 py-1.5 bg-slate-900 border border-white/20 rounded text-cyan-400 font-mono text-xs font-bold shadow-inner"
                                                >
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="mt-6 text-center text-xs text-slate-500">
                                Press <kbd className="px-2 py-1 bg-slate-900 border border-white/20 rounded text-cyan-400 font-mono">?</kbd> to toggle
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default KeyboardShortcuts;
