import { useEffect, useCallback } from 'react';

interface KeyboardShortcuts {
    onSearch?: () => void;
    onToggleFavorite?: () => void;
    onRandomSatellite?: () => void;
    onTogglePlay?: () => void;
    onEscape?: () => void;
    onHelp?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Ignore if user is typing in an input
        if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement
        ) {
            // Allow Escape to blur inputs
            if (event.key === 'Escape') {
                (event.target as HTMLElement).blur();
            }
            return;
        }

        // Prevent default for our shortcuts
        switch (event.key.toLowerCase()) {
            case '/':
                event.preventDefault();
                shortcuts.onSearch?.();
                break;
            case 'f':
                event.preventDefault();
                shortcuts.onToggleFavorite?.();
                break;
            case 'r':
                event.preventDefault();
                shortcuts.onRandomSatellite?.();
                break;
            case ' ':
                event.preventDefault();
                shortcuts.onTogglePlay?.();
                break;
            case 'escape':
                event.preventDefault();
                shortcuts.onEscape?.();
                break;
            case '?':
                event.preventDefault();
                shortcuts.onHelp?.();
                break;
        }
    }, [shortcuts]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

export const keyboardShortcutsList = [
    { key: '/', description: 'Focus search' },
    { key: 'F', description: 'Toggle favorite' },
    { key: 'R', description: 'Random satellite' },
    { key: 'Space', description: 'Play/Pause time' },
    { key: 'Esc', description: 'Close panel' },
    { key: '?', description: 'Show shortcuts' },
];
