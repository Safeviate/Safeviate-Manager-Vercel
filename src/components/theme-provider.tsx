'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { hexToHsl } from '@/lib/utils';

// --- Types ---
type ThemeColors = {
  background: string;
  primary: string;
  accent: string;
};

type CardThemeColors = {
  card: string;
  'card-foreground': string;
};

type SidebarThemeColors = {
  'sidebar-background': string;
  'sidebar-foreground': string;
  'sidebar-primary': string;
  'sidebar-primary-foreground': string;
  'sidebar-accent': string;
  'sidebar-accent-foreground': string;
  'sidebar-border': string;
};

type HeaderThemeColors = {
  'header-background': string;
  'header-foreground': string;
  'header-border': string;
};

export type SavedTheme = {
  name: string;
  colors: ThemeColors;
  cardColors: CardThemeColors;
  sidebarColors: SidebarThemeColors;
  headerColors: HeaderThemeColors;
};

type ThemeContextType = {
  theme: ThemeColors;
  setThemeValue: (key: keyof ThemeColors, value: string) => void;
  cardTheme: CardThemeColors;
  setCardThemeValue: (key: keyof CardThemeColors, value: string) => void;
  sidebarTheme: SidebarThemeColors;
  setSidebarThemeValue: (key: keyof SidebarThemeColors, value: string) => void;
  headerTheme: HeaderThemeColors;
  setHeaderThemeValue: (key: keyof HeaderThemeColors, value: string) => void;
  savedThemes: SavedTheme[];
  saveCurrentTheme: (name: string) => void;
  applySavedTheme: (theme: SavedTheme) => void;
  deleteSavedTheme: (name: string) => void;
  resetToDefaults: () => void;
};

// --- Constants ---
export const THEME_KEY = 'safeviate-theme';
export const CARD_THEME_KEY = 'safeviate-card-theme';
export const SIDEBAR_THEME_KEY = 'safeviate-sidebar-theme';
export const HEADER_THEME_KEY = 'safeviate-header-theme';
export const SAVED_THEMES_KEY = 'safeviate-saved-themes';

// --- Default Values ---
const defaultColors: ThemeColors = {
  background: '#ebf5fb',
  primary: '#7cc4f7',
  accent: '#63b2a7',
};
const defaultCardColors: CardThemeColors = {
  card: '#ebf5fb',
  'card-foreground': '#1e293b',
};
const defaultSidebarColors: SidebarThemeColors = {
  'sidebar-background': '#dbeafb',
  'sidebar-foreground': '#1e293b',
  'sidebar-primary': '#bfdbfe',
  'sidebar-primary-foreground': '#1e293b',
  'sidebar-accent': '#f1f5f9',
  'sidebar-accent-foreground': '#1e293b',
  'sidebar-border': '#94a3b8',
};
const defaultHeaderColors: HeaderThemeColors = {
  'header-background': '#ebf5fb',
  'header-foreground': '#1e293b',
  'header-border': '#e2e8f0',
};

// --- Helper Functions ---
const applyColorsToDOM = (colors: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  Object.entries(colors).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--${key}`, hexToHsl(value as string));
  });
};

const getInitialState = <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') {
        return defaultValue;
    }
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Error reading localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<ThemeColors>(() => getInitialState(THEME_KEY, defaultColors));
  const [cardTheme, setCardTheme] = useState<CardThemeColors>(() => getInitialState(CARD_THEME_KEY, defaultCardColors));
  const [sidebarTheme, setSidebarTheme] = useState<SidebarThemeColors>(() => getInitialState(SIDEBAR_THEME_KEY, defaultSidebarColors));
  const [headerTheme, setHeaderTheme] = useState<HeaderThemeColors>(() => getInitialState(HEADER_THEME_KEY, defaultHeaderColors));
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>(() => getInitialState(SAVED_THEMES_KEY, []));

  useEffect(() => {
    applyColorsToDOM(theme);
    applyColorsToDOM(cardTheme);
    applyColorsToDOM(sidebarTheme);
    applyColorsToDOM(headerTheme);
  }, [theme, cardTheme, sidebarTheme, headerTheme]);
  

  const updateTheme = <T extends object>(
    key: string,
    state: T,
    setter: React.Dispatch<React.SetStateAction<T>>,
    prop: keyof T,
    value: string
  ) => {
    const newTheme = { ...state, [prop]: value };
    setter(newTheme);
    localStorage.setItem(key, JSON.stringify(newTheme));
    document.documentElement.style.setProperty(`--${String(prop)}`, hexToHsl(value));
  };
  
  const setThemeValue = (prop: keyof ThemeColors, value: string) => updateTheme(THEME_KEY, theme, setTheme, prop, value);
  const setCardThemeValue = (prop: keyof CardThemeColors, value: string) => updateTheme(CARD_THEME_KEY, cardTheme, setCardTheme, prop, value);
  const setSidebarThemeValue = (prop: keyof SidebarThemeColors, value: string) => updateTheme(SIDEBAR_THEME_KEY, sidebarTheme, setSidebarTheme, prop, value);
  const setHeaderThemeValue = (prop: keyof HeaderThemeColors, value: string) => updateTheme(HEADER_THEME_KEY, headerTheme, setHeaderTheme, prop, value);


  const applySavedTheme = (themeToApply: SavedTheme) => {
    setTheme(themeToApply.colors);
    setCardTheme(themeToApply.cardColors);
    setSidebarTheme(themeToApply.sidebarColors);
    setHeaderTheme(themeToApply.headerColors);
    
    applyColorsToDOM(themeToApply.colors);
    applyColorsToDOM(themeToApply.cardColors);
    applyColorsToDOM(themeToApply.sidebarColors);
    applyColorsToDOM(themeToApply.headerColors);

    localStorage.setItem(THEME_KEY, JSON.stringify(themeToApply.colors));
    localStorage.setItem(CARD_THEME_KEY, JSON.stringify(themeToApply.cardColors));
    localStorage.setItem(SIDEBAR_THEME_KEY, JSON.stringify(themeToApply.sidebarColors));
    localStorage.setItem(HEADER_THEME_KEY, JSON.stringify(themeToApply.headerColors));
  };

  const saveCurrentTheme = (name: string) => {
    const newTheme: SavedTheme = {
      name,
      colors: theme,
      cardColors: cardTheme,
      sidebarColors: sidebarTheme,
      headerColors: headerTheme,
    };
    const updatedSavedThemes = [...savedThemes, newTheme];
    setSavedThemes(updatedSavedThemes);
    localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(updatedSavedThemes));
  };
  
  const deleteSavedTheme = (name: string) => {
      const updatedSavedThemes = savedThemes.filter(t => t.name !== name);
      setSavedThemes(updatedSavedThemes);
      localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(updatedSavedThemes));
  }

  const resetToDefaults = () => {
    localStorage.removeItem(THEME_KEY);
    localStorage.removeItem(CARD_THEME_KEY);
    localStorage.removeItem(SIDEBAR_THEME_KEY);
    localStorage.removeItem(HEADER_THEME_KEY);
    
    setTheme(defaultColors);
    setCardTheme(defaultCardColors);
    setSidebarTheme(defaultSidebarColors);
    setHeaderTheme(defaultHeaderColors);

    applyColorsToDOM(defaultColors);
    applyColorsToDOM(defaultCardColors);
    applyColorsToDOM(defaultSidebarColors);
    applyColorsToDOM(defaultHeaderColors);

    window.location.reload();
  };

  const value = {
    theme,
    setThemeValue,
    cardTheme,
    setCardThemeValue,
    sidebarTheme,
    setSidebarThemeValue,
    headerTheme,
    setHeaderThemeValue,
    savedThemes,
    saveCurrentTheme,
    applySavedTheme,
    deleteSavedTheme,
    resetToDefaults,
  };

  return (
    <ThemeContext.Provider value={value}>
        {children}
    </ThemeContext.Provider>
  );
};
