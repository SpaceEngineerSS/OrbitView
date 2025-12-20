"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Locale = 'en' | 'tr';

interface LocaleContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

// Import messages statically for client-side use
import enMessages from '../../messages/en.json';
import trMessages from '../../messages/tr.json';

const messages: Record<Locale, typeof enMessages> = {
    en: enMessages,
    tr: trMessages
};

function getNestedValue(obj: Record<string, unknown>, path: string): string {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = (current as Record<string, unknown>)[key];
        } else {
            return path; // Return key if not found
        }
    }

    return typeof current === 'string' ? current : path;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en');

    useEffect(() => {
        // Load saved locale from localStorage
        const savedLocale = localStorage.getItem('orbitview-locale') as Locale;
        if (savedLocale && (savedLocale === 'en' || savedLocale === 'tr')) {
            setLocaleState(savedLocale);
        } else {
            // Detect browser language
            const browserLang = navigator.language.split('-')[0];
            if (browserLang === 'tr') {
                setLocaleState('tr');
            }
        }
    }, []);

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('orbitview-locale', newLocale);
    };

    const t = (key: string): string => {
        return getNestedValue(messages[locale] as unknown as Record<string, unknown>, key);
    };

    return (
        <LocaleContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LocaleContext.Provider>
    );
}

export function useLocale() {
    const context = useContext(LocaleContext);
    if (!context) {
        throw new Error('useLocale must be used within a LocaleProvider');
    }
    return context;
}

export function useTranslations() {
    const { t } = useLocale();
    return t;
}
