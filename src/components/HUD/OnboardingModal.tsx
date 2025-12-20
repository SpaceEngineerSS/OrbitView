"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, ChevronRight, Satellite, MapPin, FlaskConical, Keyboard, Star, X } from "lucide-react";
import { useTranslations } from "@/hooks/useLocale";

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

const ONBOARDING_STEPS = [
    {
        icon: Satellite,
        title: "Welcome to OrbitView",
        description: "Track thousands of satellites in real-time on an interactive 3D globe. Let's take a quick tour of the key features.",
        color: "cyan"
    },
    {
        icon: MapPin,
        title: "Set Your Location",
        description: "Click the location button (📍) to set your observer position. This enables accurate pass predictions and visibility calculations for your area.",
        color: "emerald"
    },
    {
        icon: FlaskConical,
        title: "Analyst Mode",
        description: "Toggle Analyst Mode in the top bar to unlock advanced scientific tools: Doppler shift analysis, orbital decay prediction, conjunction analysis, and more.",
        color: "purple"
    },
    {
        icon: Keyboard,
        title: "Keyboard Shortcuts",
        description: "Power users can press '?' to see all keyboard shortcuts. Use '/' to search, 'F' to favorite, 'Space' to play/pause, and 'R' for a random satellite.",
        color: "blue"
    },
    {
        icon: Star,
        title: "Save Your Favorites",
        description: "Click the star icon on any satellite to save it to your favorites. Access them quickly from the sidebar for easy tracking.",
        color: "yellow"
    }
];

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const t = useTranslations();

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleNext = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        localStorage.setItem('orbitview-onboarding-complete', 'true');
        onComplete();
    };

    const handleSkip = () => {
        localStorage.setItem('orbitview-onboarding-complete', 'true');
        onClose();
    };

    if (!isOpen) return null;

    const step = ONBOARDING_STEPS[currentStep];
    const Icon = step.icon;
    const colorClass = {
        cyan: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
        emerald: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
        purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
        blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
        yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
    }[step.color] || 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400';

    const content = (
        <div className="flex flex-col h-full">
            {/* Skip button */}
            <div className="absolute top-4 right-4">
                <button
                    onClick={handleSkip}
                    className="text-sm text-slate-500 hover:text-white transition-colors"
                >
                    Skip
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center"
                    >
                        <div className={`p-4 rounded-2xl border ${colorClass} mb-6`}>
                            <Icon size={32} />
                        </div>

                        <h2 className="text-xl font-bold text-white mb-3">{step.title}</h2>
                        <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                            {step.description}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Progress and Navigation */}
            <div className="p-6 border-t border-white/10">
                {/* Progress dots */}
                <div className="flex justify-center gap-2 mb-4">
                    {ONBOARDING_STEPS.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentStep(index)}
                            className={`w-2 h-2 rounded-full transition-all ${index === currentStep
                                ? 'bg-cyan-500 w-6'
                                : index < currentStep
                                    ? 'bg-cyan-500/50'
                                    : 'bg-slate-700'
                                }`}
                        />
                    ))}
                </div>

                {/* Next button */}
                <button
                    onClick={handleNext}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-600 text-black font-bold rounded-lg transition-colors"
                >
                    {currentStep < ONBOARDING_STEPS.length - 1 ? (
                        <>
                            Next
                            <ChevronRight size={18} />
                        </>
                    ) : (
                        <>
                            Get Started
                            <Rocket size={18} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={`w-full ${isMobile ? 'max-w-sm' : 'max-w-md'} bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] relative`}
                >
                    {content}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default OnboardingModal;
