"use client";

import { useEffect, useRef } from "react";

/**
 * Let the browser/Android back button close an overlay instead of leaving
 * the app. Pushes a history entry while `open` is true and pops it when the
 * overlay is closed some other way.
 */
export function useBackClose(open: boolean, onClose: () => void) {
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        if (!open) return;
        const marker = { orbitviewOverlay: Math.random().toString(36).slice(2) };
        history.pushState(marker, "");
        let poppedByBack = false;
        const onPop = () => {
            poppedByBack = true;
            onCloseRef.current();
        };
        window.addEventListener("popstate", onPop);
        return () => {
            window.removeEventListener("popstate", onPop);
            // Closed by a button or Escape: remove our entry so Back still works normally.
            if (!poppedByBack && (history.state as typeof marker | null)?.orbitviewOverlay === marker.orbitviewOverlay) {
                history.back();
            }
        };
    }, [open]);
}
