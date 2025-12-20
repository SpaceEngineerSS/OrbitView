"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Globe, Palette, Clock, Monitor, Volume2, Bell, Map, Save } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
}

export interface AppSettings {
    // Display
    units: 'metric' | 'imperial';
    timeFormat: '24h' | '12h';
    theme: 'dark' | 'system';

    // Performance
    maxSatellites: number;
    orbitPathQuality: 'low' | 'medium' | 'high';
    showOrbitPaths: boolean;
    enableLOD: boolean; // Level of Detail - hide distant satellites when zoomed out

    // Notifications
    enableNotifications: boolean;
    passAlerts: boolean;
    conjunctionAlerts: boolean;

    // Map
    showGroundTrack: boolean;
    groundTrackOrbits: number; // 1 to 5
    showFootprint: boolean;
    showNightShadow: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
    units: 'metric',
    timeFormat: '24h',
    theme: 'dark',
    maxSatellites: 5000,
    orbitPathQuality: 'medium',
    showOrbitPaths: true,
    enableLOD: true, // Enable by default for better performance
    enableNotifications: true,
    passAlerts: true,
    conjunctionAlerts: false,
    showGroundTrack: true,
    groundTrackOrbits: 1,
    showFootprint: true,
    showNightShadow: true,
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    isOpen,
    onClose,
    settings,
    onSettingsChange
}) => {
    const { locale, setLocale, t } = useLocale();
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    // Keyboard escape handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleSave = () => {
        onSettingsChange(localSettings);
        localStorage.setItem('orbitview-settings', JSON.stringify(localSettings));
        onClose();
    };

    const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    if (!isOpen) return null;

    const content = (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-transparent flex justify-between items-center">
                {isMobile && (
                    <div className="absolute top-0 left-0 right-0 flex justify-center py-2">
                        <div className="w-10 h-1 bg-white/20 rounded-full" />
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-500/10 rounded-lg border border-slate-500/20 text-slate-400">
                        <Settings size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-white">Settings</h2>
                        <p className="text-[10px] text-slate-400">Configure your experience</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    aria-label="Close settings"
                    className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-white/10 rounded-lg"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-6">
                {/* Display Section */}
                <section>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                        <Monitor size={12} /> Display
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Units</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => updateSetting('units', 'metric')}
                                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${localSettings.units === 'metric' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                >
                                    Metric
                                </button>
                                <button
                                    onClick={() => updateSetting('units', 'imperial')}
                                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${localSettings.units === 'imperial' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                >
                                    Imperial
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Time Format</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => updateSetting('timeFormat', '24h')}
                                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${localSettings.timeFormat === '24h' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                >
                                    24h
                                </button>
                                <button
                                    onClick={() => updateSetting('timeFormat', '12h')}
                                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${localSettings.timeFormat === '12h' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                >
                                    12h
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Language</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setLocale('en')}
                                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${locale === 'en' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                >
                                    🇬🇧 EN
                                </button>
                                <button
                                    onClick={() => setLocale('tr')}
                                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${locale === 'tr' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                >
                                    🇹🇷 TR
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Performance Section */}
                <section>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                        <Clock size={12} /> Performance
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Max Satellites</span>
                            <select
                                value={localSettings.maxSatellites}
                                onChange={(e) => updateSetting('maxSatellites', parseInt(e.target.value))}
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                            >
                                <option value={1000}>1000</option>
                                <option value={2500}>2500</option>
                                <option value={5000}>5000 (All)</option>
                            </select>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Orbit Quality</span>
                            <div className="flex gap-1">
                                {(['low', 'medium', 'high'] as const).map(q => (
                                    <button
                                        key={q}
                                        onClick={() => updateSetting('orbitPathQuality', q)}
                                        className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${localSettings.orbitPathQuality === q ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Show Orbit Paths</span>
                            <ToggleSwitch
                                checked={localSettings.showOrbitPaths}
                                onChange={(v) => updateSetting('showOrbitPaths', v)}
                                label="Show orbit paths"
                            />
                        </div>

                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-sm text-slate-300">Smart LOD</span>
                                <p className="text-[10px] text-slate-500">Hide distant satellites when zoomed out</p>
                            </div>
                            <ToggleSwitch
                                checked={localSettings.enableLOD}
                                onChange={(v) => updateSetting('enableLOD', v)}
                                label="Enable Level of Detail"
                            />
                        </div>
                    </div>
                </section>

                {/* Map Section */}
                <section>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                        <Map size={12} /> Map
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Show Ground Track</span>
                            <ToggleSwitch
                                checked={localSettings.showGroundTrack}
                                onChange={(v) => updateSetting('showGroundTrack', v)}
                            />
                        </div>

                        {localSettings.showGroundTrack && (
                            <div className="flex justify-between items-center pl-4 border-l border-white/5 py-1">
                                <span className="text-xs text-slate-400">Future Orbits</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 5].map(n => (
                                        <button
                                            key={n}
                                            onClick={() => updateSetting('groundTrackOrbits', n)}
                                            className={`w-8 h-8 flex items-center justify-center text-[10px] rounded-lg transition-colors ${localSettings.groundTrackOrbits === n ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-slate-500 hover:bg-white/10 border border-transparent'}`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Show Coverage Footprint</span>
                            <ToggleSwitch
                                checked={localSettings.showFootprint}
                                onChange={(v) => updateSetting('showFootprint', v)}
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Show Night Shadow</span>
                            <ToggleSwitch
                                checked={localSettings.showNightShadow}
                                onChange={(v) => updateSetting('showNightShadow', v)}
                            />
                        </div>
                    </div>
                </section>

                {/* Notifications Section */}
                <section>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                        <Bell size={12} /> Notifications
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Enable Notifications</span>
                            <ToggleSwitch
                                checked={localSettings.enableNotifications}
                                onChange={(v) => updateSetting('enableNotifications', v)}
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Pass Alerts</span>
                            <ToggleSwitch
                                checked={localSettings.passAlerts}
                                onChange={(v) => updateSetting('passAlerts', v)}
                                disabled={!localSettings.enableNotifications}
                            />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">Conjunction Alerts</span>
                            <ToggleSwitch
                                checked={localSettings.conjunctionAlerts}
                                onChange={(v) => updateSetting('conjunctionAlerts', v)}
                                disabled={!localSettings.enableNotifications}
                            />
                        </div>
                    </div>
                </section>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-black/20">
                <button
                    onClick={handleSave}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-600 text-black font-bold rounded-lg transition-colors"
                >
                    <Save size={18} />
                    Save Settings
                </button>
            </div>
        </div>
    );

    // Mobile: Bottom sheet
    if (isMobile) {
        return (
            <AnimatePresence>
                <motion.div
                    key="settings-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    onClick={onClose}
                />
                <motion.div
                    key="settings-sheet"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 z-50 rounded-t-3xl max-h-[85vh] flex flex-col"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {content}
                </motion.div>
            </AnimatePresence>
        );
    }

    // Desktop: Modal
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-md bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] max-h-[80vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {content}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Toggle Switch Component
const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
}> = ({ checked, onChange, disabled = false, label }) => (
    <button
        onClick={() => !disabled && onChange(!checked)}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-disabled={disabled}
        className={`w-11 h-6 rounded-full relative transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            } ${checked ? 'bg-cyan-500' : 'bg-slate-700'}`}
    >
        <motion.div
            className="w-4 h-4 bg-white rounded-full absolute top-1 shadow"
            animate={{ left: checked ? '1.5rem' : '0.25rem' }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />
    </button>
);

export default SettingsPanel;
