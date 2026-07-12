"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Languages, Check } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface LanguageSwitcherProps {
    className?: string;
}

const LANGUAGES = [
    { code: 'en' as const, name: 'English', flag: '🇬🇧' },
    { code: 'tr' as const, name: 'Türkçe', flag: '🇹🇷' }
];

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = "" }) => {
    const { locale, setLocale } = useLocale();
    const [isOpen, setIsOpen] = React.useState(false);

    const currentLang = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 bg-slate-800/50 border border-white/10 rounded-xl text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all flex items-center gap-2"
                title="Change Language"
            >
                <Languages size={18} />
                <span className="text-sm hidden sm:inline">{currentLang.flag}</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full right-0 mt-2 w-40 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-xl z-50"
                        >
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLocale(lang.code);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors ${locale === lang.code ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-300'}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span>{lang.flag}</span>
                                        <span className="text-sm">{lang.name}</span>
                                    </span>
                                    {locale === lang.code && <Check size={16} />}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LanguageSwitcher;
