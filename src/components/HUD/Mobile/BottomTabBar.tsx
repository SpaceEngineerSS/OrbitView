"use client";

import React, { memo } from "react";
import { Globe, Search, BarChart3, Settings, FlaskConical } from "lucide-react";
import { clsx } from "clsx";
import { useHaptic } from "@/hooks/useHaptic";

/**
 * BottomTabBar - Google Maps-style bottom navigation for mobile
 * Fixed at screen bottom with glassmorphism effect and safe-area padding
 * 5 tabs: Explore | Search | Science | Data | Settings
 */

export type MobileTab = 'explore' | 'search' | 'science' | 'data' | 'settings';

interface BottomTabBarProps {
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
    hasSelectedSatellite?: boolean;
}

interface TabItem {
    id: MobileTab;
    label: string;
    icon: React.ElementType;
}

const tabs: TabItem[] = [
    { id: 'explore', label: 'Explore', icon: Globe },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'science', label: 'Science', icon: FlaskConical },
    { id: 'data', label: 'Data', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
];

const BottomTabBar: React.FC<BottomTabBarProps> = ({
    activeTab,
    onTabChange,
    hasSelectedSatellite = false,
}) => {
    const { trigger } = useHaptic();

    const handleTabChange = (tab: MobileTab) => {
        trigger('light');
        onTabChange(tab);
    };

    return (
        <nav
            className="mobile-tab-bar"
            role="tablist"
            aria-label="Mobile navigation"
        >
            <div className="flex items-center justify-around h-16 px-1">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    // Show notification dot on Data tab when satellite is selected
                    const showBadge = (tab.id === 'data' || tab.id === 'science') && hasSelectedSatellite;

                    return (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`${tab.id}-panel`}
                            onClick={() => handleTabChange(tab.id)}
                            className={clsx(
                                "flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-200 tap-target relative",
                                isActive
                                    ? "text-cyan-400"
                                    : "text-gray-400 hover:text-gray-300 active:scale-95"
                            )}
                        >
                            {/* Icon */}
                            <div className="relative">
                                <Icon
                                    size={22}
                                    strokeWidth={isActive ? 2 : 1.5}
                                    className={clsx(
                                        "transition-all duration-200",
                                        isActive && "drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                                    )}
                                />

                                {/* Notification Badge */}
                                {showBadge && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                                )}
                            </div>

                            {/* Label */}
                            <span
                                className={clsx(
                                    "text-[9px] font-medium tracking-wide transition-all duration-200",
                                    isActive ? "opacity-100" : "opacity-70"
                                )}
                            >
                                {tab.label}
                            </span>

                            {/* Active Indicator */}
                            {isActive && (
                                <span
                                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full"
                                    aria-hidden="true"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default memo(BottomTabBar);

