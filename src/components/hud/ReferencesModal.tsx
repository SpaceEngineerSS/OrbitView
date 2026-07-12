"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen,
    X,
    ExternalLink,
    Copy,
    Check,
    FileText,
    Globe,
    Satellite,
    FlaskConical
} from "lucide-react";

interface ReferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * References Modal
 * 
 * Displays academic references, API documentation, and algorithms used
 * in OrbitView satellite tracking application.
 */
const ReferencesModal: React.FC<ReferencesModalProps> = ({ isOpen, onClose }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const references = [
        {
            id: 'vallado',
            category: 'primary',
            title: 'Fundamentals of Astrodynamics and Applications',
            authors: 'Vallado, D. A.',
            year: 2013,
            edition: '4th Edition',
            publisher: 'Microcosm Press',
            isbn: '978-1881883180',
            description: 'Comprehensive reference for orbital mechanics, SGP4 propagation, and astrodynamics algorithms.',
            bibtex: `@book{vallado2013,
  author = {Vallado, David A.},
  title = {Fundamentals of Astrodynamics and Applications},
  edition = {4th},
  publisher = {Microcosm Press},
  year = {2013},
  isbn = {978-1881883180}
}`
        },
        {
            id: 'hoots',
            category: 'primary',
            title: 'Spacetrack Report No. 3: Models for Propagation of NORAD Element Sets',
            authors: 'Hoots, F. R., Roehrich, R. L.',
            year: 1980,
            publisher: 'NORAD/USSPACECOM',
            url: 'https://celestrak.org/NORAD/documentation/spacetrk.pdf',
            description: 'Original SGP4/SDP4 propagation algorithm documentation.',
            bibtex: `@techreport{hoots1980,
  author = {Hoots, Felix R. and Roehrich, Ronald L.},
  title = {Spacetrack Report No. 3: Models for Propagation of NORAD Element Sets},
  institution = {NORAD/USSPACECOM},
  year = {1980}
}`
        },
        {
            id: 'kelso',
            category: 'data',
            title: 'CelesTrak',
            authors: 'Kelso, T. S.',
            year: '2024',
            url: 'https://celestrak.org',
            description: 'TLE (Two-Line Element) data source for satellite orbital elements.',
            bibtex: `@misc{celestrak2024,
  author = {Kelso, T. S.},
  title = {CelesTrak},
  year = {2024},
  url = {https://celestrak.org}
}`
        },
        {
            id: 'horizons',
            category: 'data',
            title: 'JPL Horizons System',
            authors: 'NASA/JPL',
            year: '2024',
            url: 'https://ssd.jpl.nasa.gov/horizons/',
            description: 'Ephemeris data for solar system bodies and deep space missions like JWST.',
            bibtex: `@misc{jplhorizons2024,
  author = {{NASA/JPL}},
  title = {Horizons On-Line Ephemeris System},
  year = {2024},
  url = {https://ssd.jpl.nasa.gov/horizons/}
}`
        },
        {
            id: 'satellite-js',
            category: 'library',
            title: 'satellite.js',
            authors: 'Shashwat Kandadai et al.',
            year: '2024',
            url: 'https://github.com/shashwatak/satellite-js',
            description: 'JavaScript implementation of SGP4/SDP4 satellite propagation algorithms.',
            bibtex: `@software{satellitejs2024,
  author = {Kandadai, Shashwat and others},
  title = {satellite.js},
  year = {2024},
  url = {https://github.com/shashwatak/satellite-js}
}`
        },
        {
            id: 'cesium',
            category: 'library',
            title: 'CesiumJS',
            authors: 'Cesium GS, Inc.',
            year: '2024',
            url: 'https://cesium.com/platform/cesiumjs/',
            description: '3D geospatial visualization platform for the globe rendering.',
            bibtex: `@software{cesiumjs2024,
  author = {{Cesium GS, Inc.}},
  title = {CesiumJS},
  year = {2024},
  url = {https://cesium.com/platform/cesiumjs/}
}`
        }
    ];

    const algorithms = [
        {
            name: 'SGP4/SDP4 Propagation',
            description: 'Simplified perturbations models for near-Earth (SGP4) and deep-space (SDP4) satellite orbit prediction.',
            source: 'Spacetrack Report No. 3'
        },
        {
            name: 'Doppler Shift Calculation',
            description: 'Relativistic Doppler effect: Δf = (v_r / c) × f_0, where v_r is radial velocity.',
            source: 'Fundamentals of Astrodynamics'
        },
        {
            name: 'Orbital Decay (King-Hele)',
            description: 'Atmospheric drag decay model using B* coefficient and exponential atmosphere model.',
            source: 'King-Hele, D. G. (1987)'
        },
        {
            name: 'Ground Track Calculation',
            description: 'ECI to geodetic coordinate transformation with proper GMST calculation.',
            source: 'Vallado (2013), Chapter 3'
        },
        {
            name: 'Pass Prediction',
            description: 'Iterative AOS/LOS/MaxElevation finder using look angle calculations.',
            source: 'Fundamentals of Astrodynamics'
        }
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-2xl max-h-[85vh] bg-slate-950/95 backdrop-blur-xl border border-purple-500/20 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 bg-gradient-to-r from-purple-950/50 to-transparent flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                <BookOpen size={20} className="text-purple-400" />
                            </div>
                            <div>
                                <h2 className="font-bold text-white">References & Citations</h2>
                                <p className="text-[10px] text-slate-400">Academic sources and algorithms</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 overflow-y-auto max-h-[calc(85vh-140px)] space-y-6 custom-scrollbar">

                        {/* Primary References */}
                        <section>
                            <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                                <FileText size={12} /> Primary References
                            </h3>
                            <div className="space-y-3">
                                {references.filter(r => r.category === 'primary').map(ref => (
                                    <ReferenceCard
                                        key={ref.id}
                                        reference={ref}
                                        copiedId={copiedId}
                                        onCopy={copyToClipboard}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* Data Sources */}
                        <section>
                            <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                                <Globe size={12} /> Data Sources
                            </h3>
                            <div className="space-y-3">
                                {references.filter(r => r.category === 'data').map(ref => (
                                    <ReferenceCard
                                        key={ref.id}
                                        reference={ref}
                                        copiedId={copiedId}
                                        onCopy={copyToClipboard}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* Libraries */}
                        <section>
                            <h3 className="text-[10px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                                <Satellite size={12} /> Libraries & Tools
                            </h3>
                            <div className="space-y-3">
                                {references.filter(r => r.category === 'library').map(ref => (
                                    <ReferenceCard
                                        key={ref.id}
                                        reference={ref}
                                        copiedId={copiedId}
                                        onCopy={copyToClipboard}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* Algorithms */}
                        <section>
                            <h3 className="text-[10px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                                <FlaskConical size={12} /> Algorithms Used
                            </h3>
                            <div className="grid gap-2">
                                {algorithms.map((algo, idx) => (
                                    <div key={idx} className="bg-slate-900/50 rounded-lg border border-white/5 p-3">
                                        <div className="font-semibold text-white text-sm">{algo.name}</div>
                                        <p className="text-xs text-slate-400 mt-1">{algo.description}</p>
                                        <div className="text-[10px] text-orange-400 mt-1 font-mono">Source: {algo.source}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/10 bg-black/20 text-center">
                        <p className="text-[10px] text-slate-500">
                            OrbitView is an open-source project. All referenced materials are used in accordance with academic fair use.
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Reference Card Component
interface ReferenceCardProps {
    reference: {
        id: string;
        title: string;
        authors: string;
        year: string | number;
        edition?: string;
        publisher?: string;
        url?: string;
        isbn?: string;
        description: string;
        bibtex: string;
    };
    copiedId: string | null;
    onCopy: (text: string, id: string) => void;
}

const ReferenceCard: React.FC<ReferenceCardProps> = ({ reference, copiedId, onCopy }) => (
    <div className="bg-slate-900/50 rounded-lg border border-white/5 p-3">
        <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
                <div className="font-semibold text-white text-sm">{reference.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                    {reference.authors} ({reference.year})
                    {reference.edition && `, ${reference.edition}`}
                </div>
                {reference.publisher && (
                    <div className="text-[10px] text-slate-500">{reference.publisher}</div>
                )}
                <p className="text-xs text-slate-400 mt-2">{reference.description}</p>
            </div>
            <div className="flex gap-1">
                {reference.url && (
                    <a
                        href={reference.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                        title="Open Link"
                    >
                        <ExternalLink size={14} />
                    </a>
                )}
                <button
                    onClick={() => onCopy(reference.bibtex, reference.id)}
                    className="p-1.5 text-slate-500 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-colors"
                    title="Copy BibTeX"
                >
                    {copiedId === reference.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
            </div>
        </div>
    </div>
);

export default ReferencesModal;
