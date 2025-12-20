"use client";

import React from "react";
import { Github, Twitter, Heart, ExternalLink, Satellite } from "lucide-react";

interface FooterProps {
    className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = "" }) => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={`fixed bottom-0 left-0 right-0 z-10 pointer-events-none ${className}`}>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-4 pb-4 pt-8">
                <div className="flex items-center justify-between text-xs pointer-events-auto">
                    {/* Left - Brand */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Satellite className="w-4 h-4 text-cyan-400" />
                            <span className="font-semibold text-white">OrbitView</span>
                        </div>
                        <span className="text-slate-500 hidden sm:inline">|</span>
                        <span className="text-slate-500 hidden sm:inline">v1.0.0</span>
                    </div>

                    {/* Center - Made with love */}
                    <div className="hidden md:flex items-center gap-1 text-slate-500">
                        Made with <Heart className="w-3 h-3 text-red-400 fill-red-400" /> for space enthusiasts
                    </div>

                    {/* Right - Links */}
                    <div className="flex items-center gap-4">
                        <a
                            href="https://github.com/SpaceEngineerSS/OrbitView"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
                        >
                            <Github className="w-4 h-4" />
                            <span className="hidden sm:inline">GitHub</span>
                        </a>
                        <a
                            href="https://twitter.com/persesmg"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                        >
                            <Twitter className="w-4 h-4" />
                            <span className="hidden sm:inline">Twitter</span>
                        </a>
                        <a
                            href="https://celestrak.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                            <ExternalLink className="w-3 h-3" />
                            <span className="hidden sm:inline">CelesTrak</span>
                        </a>
                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-2 text-center pointer-events-auto">
                    <p className="text-[10px] text-slate-600">
                        © {currentYear} OrbitView. MIT License. Data provided by{" "}
                        <a href="https://celestrak.org" className="text-slate-500 hover:text-cyan-400 transition-colors">
                            CelesTrak
                        </a>
                        {" & "}
                        <a href="https://ssd.jpl.nasa.gov/horizons/" className="text-slate-500 hover:text-cyan-400 transition-colors">
                            NASA Horizons
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
