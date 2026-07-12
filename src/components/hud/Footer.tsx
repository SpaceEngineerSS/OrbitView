import React from "react";

const Footer = () => {
    return (
        <footer className="fixed bottom-4 right-6 z-50 pointer-events-auto">
            <div className="flex flex-col items-end gap-1">
                <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                    OrbitView Systems &copy; 2026
                </div>
                <a
                    href="https://github.com/SpaceEngineerSS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-500/70 hover:text-cyan-400 font-heading tracking-wide transition-colors flex items-center gap-2 group"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/50 group-hover:bg-cyan-400 group-hover:shadow-[0_0_8px_rgba(0,243,255,0.8)] transition-all"></span>
                    Architected by Mehmet Gümüş (SpaceEngineerSS)
                </a>
            </div>
        </footer>
    );
};

export default Footer;
