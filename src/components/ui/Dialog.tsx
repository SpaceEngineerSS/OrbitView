"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X, Info } from "@phosphor-icons/react";
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
 * Modal: a centred card on desktop, a sheet rising from the bottom on phones.
 * Escape and the Android back button close it; focus stays inside.
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
                        className="absolute inset-0 bg-black/40"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />
                    <motion.div
                        ref={ref}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        initial={{ opacity: 0, y: 40, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                        className={cx(
                            "relative flex flex-col w-full max-h-[90dvh] bg-card shadow-pop",
                            "rounded-t-[28px] md:rounded-[28px] md:mx-4 pb-[var(--safe-bottom)] md:pb-0",
                            width === "sm" && "md:max-w-sm",
                            width === "md" && "md:max-w-lg",
                            width === "lg" && "md:max-w-2xl"
                        )}
                    >
                        <div aria-hidden className="md:hidden mx-auto mt-2 h-[5px] w-9 rounded-full bg-fill-strong" />
                        <header className="flex items-center justify-between pl-5 pr-3 pt-3 pb-1 shrink-0">
                            <h2 id={titleId} className="text-[19px] font-semibold tracking-tight">{title}</h2>
                            <IconButton label={closeLabel} size="sm" onClick={onClose}><X size={16} weight="bold" /></IconButton>
                        </header>
                        <div className="flex-1 min-h-0 scroll px-5 pt-2 pb-5">{children}</div>
                        {footer && <footer className="flex justify-end gap-2 px-5 pb-5 shrink-0">{footer}</footer>}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

/** Small "i" button that opens the honest fine print for a card. */
export function InfoButton({ title, closeLabel, children }: { title: string; closeLabel: string; children: ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <IconButton label={title} size="sm" variant="ghost" onClick={() => setOpen(true)}>
                <Info size={18} />
            </IconButton>
            <Dialog open={open} onClose={() => setOpen(false)} title={title} closeLabel={closeLabel} width="sm">
                <div className="text-[14px] leading-relaxed text-ink-2 space-y-3">{children}</div>
            </Dialog>
        </>
    );
}
