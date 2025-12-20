import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'orbitview_favorites';

export interface UseFavoritesReturn {
    favorites: string[];
    isFavorite: (id: string) => boolean;
    toggleFavorite: (id: string) => void;
    addFavorite: (id: string) => void;
    removeFavorite: (id: string) => void;
    clearFavorites: () => void;
}

export function useFavorites(): UseFavoritesReturn {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load favorites from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setFavorites(parsed);
                }
            }
        } catch (error) {
            console.error('Failed to load favorites:', error);
        }
        setIsLoaded(true);
    }, []);

    // Save favorites to localStorage whenever they change
    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
            } catch (error) {
                console.error('Failed to save favorites:', error);
            }
        }
    }, [favorites, isLoaded]);

    const isFavorite = useCallback((id: string) => {
        return favorites.includes(id);
    }, [favorites]);

    const toggleFavorite = useCallback((id: string) => {
        setFavorites(prev => {
            if (prev.includes(id)) {
                return prev.filter(fav => fav !== id);
            } else {
                return [...prev, id];
            }
        });
    }, []);

    const addFavorite = useCallback((id: string) => {
        setFavorites(prev => {
            if (!prev.includes(id)) {
                return [...prev, id];
            }
            return prev;
        });
    }, []);

    const removeFavorite = useCallback((id: string) => {
        setFavorites(prev => prev.filter(fav => fav !== id));
    }, []);

    const clearFavorites = useCallback(() => {
        setFavorites([]);
    }, []);

    return {
        favorites,
        isFavorite,
        toggleFavorite,
        addFavorite,
        removeFavorite,
        clearFavorites
    };
}
