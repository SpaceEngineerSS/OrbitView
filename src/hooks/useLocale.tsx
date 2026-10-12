"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import enMessages from '../../messages/en.json';
import trMessages from '../../messages/tr.json';

export type Locale = 'en' | 'tr';

type Vars = Record<string, string | number>;

interface LocaleContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    /** Look up a dotted key; `{name}` placeholders are filled from `vars`. */
    t: (key: string, vars?: Vars) => string;
    /** Intl locale tag used for numbers and dates */
    intl: string;
}

const MESSAGES: Record<Locale, unknown> = { en: enMessages, tr: trMessages };
const STORAGE_KEY = 'orbitview-locale';

function lookup(tree: unknown, key: string): string | undefined {
    let node = tree;
    for (const part of key.split('.')) {
        if (node && typeof node === 'object' && part in node) {
            node = (node as Record<string, unknown>)[part];
        } else {
            return undefined;
        }
    }
    return typeof node === 'string' ? node : undefined;
}

function interpolate(text: string, vars?: Vars): string {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en');

    useEffect(() => {
        let initial: Locale = 'en';
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === 'en' || saved === 'tr') initial = saved;
            else if (navigator.language.toLowerCase().startsWith('tr')) initial = 'tr';
        } catch {
            if (navigator.language.toLowerCase().startsWith('tr')) initial = 'tr';
        }
        setLocaleState(initial);
    }, []);

    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const setLocale = useCallback((next: Locale) => {
        setLocaleState(next);
        try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode */ }
    }, []);

    const t = useCallback((key: string, vars?: Vars) => {
        const text = lookup(MESSAGES[locale], key) ?? lookup(MESSAGES.en, key);
        if (text === undefined) {
            if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] missing key: ${key}`);
            return key;
        }
        return interpolate(text, vars);
    }, [locale]);

    const value = useMemo<LocaleContextValue>(() => ({
        locale,
        setLocale,
        t,
        intl: locale === 'tr' ? 'tr-TR' : 'en-GB',
    }), [locale, setLocale, t]);

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
    const ctx = useContext(LocaleContext);
    if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
    return ctx;
}

export function useT() {
    return useLocale().t;
}
