"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";
import { keyboardShortcutsList } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="bg-slate-950/90 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] relative"
                    >
                        {/* Decorative Elements */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10 p-2 hover:bg-white/5 rounded-full"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                                    <Keyboard size={24} className="text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
                                    <p className="text-xs text-slate-500">Navigate faster with keyboard</p>
                                </div>
                            </div>

                            {/* Shortcuts List */}
                            <div className="space-y-2">
                                {keyboardShortcutsList.map((shortcut) => (
                                    <div
                                        key={shortcut.key}
                                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-cyan-500/20 transition-colors"
                                    >
                                        <span className="text-sm text-slate-300">{shortcut.description}</span>
                                        <kbd className="px-3 py-1.5 bg-black/40 rounded-lg text-cyan-400 font-mono text-sm border border-white/10">
                                            {shortcut.key}
                                        </kbd>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="mt-6 pt-4 border-t border-white/10 text-center">
                                <span className="text-[10px] text-slate-600 font-mono">Press ? anytime to show shortcuts</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default KeyboardShortcutsModal;
