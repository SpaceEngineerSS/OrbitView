"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { IconButton } from "./Button";
import { cx } from "./cx";
import { useBackClose } from "@/hooks/useBackClose";

interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    closeLabel: string;
    children: ReactNode;
    footer?: ReactNode;
    width?: "sm" | "md" | "lg";
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog: centred on desktop, full-width from the bottom on phones.
 * Escape and the Android back button close it; focus stays inside while open.
 */
export function Dialog({ open, onClose, title, closeLabel, children, footer, width = "md" }: DialogProps) {
    const ref = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useBackClose(open, onClose);

    useEffect(() => {
        if (!open) return;
        const prev = document.activeElement as HTMLElement | null;
        const el = ref.current;
        requestAnimationFrame(() => el?.querySelector<HTMLElement>(FOCUSABLE)?.focus());

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
            if (e.key !== "Tab" || !el) return;
            const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (!items.length) return;
            const first = items[0], last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        document.addEventListener("keydown", onKey, true);
        return () => {
            document.removeEventListener("keydown", onKey, true);
            prev?.focus?.();
        };
    }, [open, onClose]);

    if (typeof document === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 flex items-end md:items-center justify-center" style={{ zIndex: "var(--z-dialog)" }}>
                    <motion.div
                        className="absolute inset-0 bg-[#0b0c0e]/75"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.14 }}
                        onClick={onClose}
                    />
                    <motion.div
                        ref={ref}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
                        className={cx(
                            "relative flex flex-col w-full max-h-[88dvh] bg-surface border border-rule-strong",
                            "md:mx-4 pb-[var(--safe-bottom)] md:pb-0",
                            width === "sm" && "md:max-w-sm",
                            width === "md" && "md:max-w-lg",
                            width === "lg" && "md:max-w-2xl"
                        )}
                    >
                        <header className="flex items-center justify-between h-11 pl-4 pr-1.5 border-b border-rule shrink-0">
                            <h2 id={titleId} className="text-[13px] font-medium tracking-wide">{title}</h2>
                            <IconButton label={closeLabel} onClick={onClose}><X size={16} strokeWidth={1.5} /></IconButton>
                        </header>
                        <div className="flex-1 min-h-0 scroll px-4 py-3">{children}</div>
                        {footer && <footer className="flex justify-end gap-2 px-4 py-3 border-t border-rule shrink-0">{footer}</footer>}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
