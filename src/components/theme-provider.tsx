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
const getCssVar = (name: string) => {
  if (typeof window === 'undefined') return '';
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `hsl(${val.replace(/ /g, ', ')})`;
};

function hslToHex(hsl: string) {
    if (!hsl) return '#000000';
    let [h, s, l] = hsl.match(/\d+/g)!.map(Number);
    s /= 100;
    l /= 100;
    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
        m = l - c / 2,
        r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) { [r,g,b] = [c,x,0] } 
    else if (60 <= h && h < 120) { [r,g,b] = [x,c,0] }
    else if (120 <= h && h < 180) { [r,g,b] = [0,c,x] } 
    else if (180 <= h && h < 240) { [r,g,b] = [0,x,c] } 
    else if (240 <= h && h < 300) { [r,g,b] = [x,0,c] } 
    else if (300 <= h && h < 360) { [r,g,b] = [c,0,x] }
    const toHex = (c: number) => ('0' + Math.round((c + m) * 255).toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}


const applyColorsToDOM = (colors: Record<string, string>) => {
  Object.entries(colors).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--${key}`, hexToHsl(value as string));
  });
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
  const [theme, setTheme] = useState<ThemeColors>(() => defaultColors);
  const [cardTheme, setCardTheme] = useState<CardThemeColors>(() => defaultCardColors);
  const [sidebarTheme, setSidebarTheme] = useState<SidebarThemeColors>(() => defaultSidebarColors);
  const [headerTheme, setHeaderTheme] = useState<HeaderThemeColors>(() => defaultHeaderColors);
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([]);

  const loadFromDOM = () => {
    setTheme({
      background: hslToHex(getCssVar('--background')),
      primary: hslToHex(getCssVar('--primary')),
      accent: hslToHex(getCssVar('--accent')),
    });
    setCardTheme({
      'card': hslToHex(getCssVar('--card')),
      'card-foreground': hslToHex(getCssVar('--card-foreground')),
    });
    setSidebarTheme({
      'sidebar-background': hslToHex(getCssVar('--sidebar-background')),
      'sidebar-foreground': hslToHex(getCssVar('--sidebar-foreground')),
      'sidebar-primary': hslToHex(getCssVar('--sidebar-primary')),
      'sidebar-primary-foreground': hslToHex(getCssVar('--sidebar-primary-foreground')),
      'sidebar-accent': hslToHex(getCssVar('--sidebar-accent')),
      'sidebar-accent-foreground': hslToHex(getCssVar('--sidebar-accent-foreground')),
      'sidebar-border': hslToHex(getCssVar('--sidebar-border')),
    });
    setHeaderTheme({
      'header-background': hslToHex(getCssVar('--header-background')),
      'header-foreground': hslToHex(getCssVar('--header-foreground')),
      'header-border': hslToHex(getCssVar('--header-border')),
    });
  };

  useEffect(() => {
    // This effect runs once on mount to sync state with localStorage
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      const savedCardTheme = localStorage.getItem(CARD_THEME_KEY);
      const savedSidebarTheme = localStorage.getItem(SIDEBAR_THEME_KEY);
      const savedHeaderTheme = localStorage.getItem(HEADER_THEME_KEY);
      const allSavedThemes = localStorage.getItem(SAVED_THEMES_KEY);

      if (savedTheme || savedCardTheme || savedSidebarTheme || savedHeaderTheme) {
        if(savedTheme) setTheme(JSON.parse(savedTheme));
        if(savedCardTheme) setCardTheme(JSON.parse(savedCardTheme));
        if(savedSidebarTheme) setSidebarTheme(JSON.parse(savedSidebarTheme));
        if(savedHeaderTheme) setHeaderTheme(JSON.parse(savedHeaderTheme));
      } else {
        // If nothing is in local storage, load the defaults from the DOM (CSS variables)
        loadFromDOM();
      }

      if (allSavedThemes) {
        setSavedThemes(JSON.parse(allSavedThemes));
      }
    } catch (e) {
      console.error('Failed to parse theme from localStorage', e);
      loadFromDOM(); // Fallback to DOM if localStorage is corrupt
    }
  }, []);

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
    
    // We can't just reload, we need to reset the state and apply defaults
    setTheme(defaultColors);
    setCardTheme(defaultCardColors);
    setSidebarTheme(defaultSidebarColors);
    setHeaderTheme(defaultHeaderColors);

    applyColorsToDOM(defaultColors);
    applyColorsToDOM(defaultCardColors);
    applyColorsToDOM(defaultSidebarColors);
    applyColorsToDOM(defaultHeaderColors);

    // After reset, we might want to manually clear the styles to let CSS take over
    // or reload. For now, explicitly setting to defaults is safer.
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
