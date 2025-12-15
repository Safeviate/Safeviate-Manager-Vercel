
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { hexToHsl } from '@/lib/utils';

// --- Types ---
type ThemeColors = {
  background: string;
  primary: string;
  accent: string;
};

type ButtonThemeColors = {
  'button-primary-background': string;
  'button-primary-foreground': string;
  'button-primary-accent': string;
  'button-primary-accent-foreground': string;
};

type CardThemeColors = {
  card: string;
  'card-foreground': string;
};

type PopoverThemeColors = {
  popover: string;
  'popover-foreground': string;
};

type SidebarThemeColors = {
  'sidebar-background': string;
  'sidebar-foreground': string;
  'sidebar-primary': string;
  'sidebar-primary-foreground': string;
  'sidebar-accent': string;
  'sidebar-accent-foreground': string;
  'sidebar-border': string;
  'sidebar-ring': string;
};

type HeaderThemeColors = {
  'header-background': string;
  'header-foreground': string;
  'header-border': string;
};

type SwimlaneThemeColors = {
  'swimlane-header-background': string;
  'swimlane-header-foreground': string;
};

export type SavedTheme = {
  name: string;
  colors: ThemeColors;
  buttonColors: ButtonThemeColors;
  cardColors: CardThemeColors;
  sidebarColors: SidebarThemeColors;
  headerColors: HeaderThemeColors;
  popoverColors: PopoverThemeColors;
  swimlaneColors: SwimlaneThemeColors;
  scale?: number;
};

type ThemeContextType = {
  theme: ThemeColors;
  setThemeValue: (key: keyof ThemeColors, value: string) => void;
  buttonTheme: ButtonThemeColors;
  setButtonThemeValue: (key: keyof ButtonThemeColors, value: string) => void;
  cardTheme: CardThemeColors;
  setCardThemeValue: (key: keyof CardThemeColors, value: string) => void;
  popoverTheme: PopoverThemeColors;
  setPopoverThemeValue: (key: keyof PopoverThemeColors, value: string) => void;
  sidebarTheme: SidebarThemeColors;
  setSidebarThemeValue: (key: keyof SidebarThemeColors, value: string) => void;
  headerTheme: HeaderThemeColors;
  setHeaderThemeValue: (key: keyof HeaderThemeColors, value: string) => void;
  swimlaneTheme: SwimlaneThemeColors;
  setSwimlaneThemeValue: (key: keyof SwimlaneThemeColors, value: string) => void;
  scale: number;
  setScale: (scale: number) => void;
  savedThemes: SavedTheme[];
  saveCurrentTheme: (name: string) => void;
  applySavedTheme: (theme: SavedTheme) => void;
  deleteSavedTheme: (name: string) => void;
  resetToDefaults: () => void;
};

// --- Constants ---
export const THEME_KEY = 'safeviate-theme';
export const BUTTON_THEME_KEY = 'safeviate-button-theme';
export const CARD_THEME_KEY = 'safeviate-card-theme';
export const POPOVER_THEME_KEY = 'safeviate-popover-theme';
export const SIDEBAR_THEME_KEY = 'safeviate-sidebar-theme';
export const HEADER_THEME_KEY = 'safeviate-header-theme';
export const SWIMLANE_THEME_KEY = 'safeviate-swimlane-theme';
export const SCALE_KEY = 'safeviate-scale';
export const SAVED_THEMES_KEY = 'safeviate-saved-themes';

// --- Default Values ---
const defaultColors: ThemeColors = {
  background: '#ebf5fb',
  primary: '#7cc4f7',
  accent: '#63b2a7',
};
const defaultButtonColors: ButtonThemeColors = {
    'button-primary-background': '#7cc4f7',
    'button-primary-foreground': '#1e293b',
    'button-primary-accent': '#63b2a7',
    'button-primary-accent-foreground': '#ffffff',
};
const defaultCardColors: CardThemeColors = {
  card: '#ebf5fb',
  'card-foreground': '#1e293b',
};
const defaultPopoverColors: PopoverThemeColors = {
    popover: '#ebf5fb',
    'popover-foreground': '#1e293b',
};
const defaultSidebarColors: SidebarThemeColors = {
  'sidebar-background': '#dbeafb',
  'sidebar-foreground': '#1e293b',
  'sidebar-primary': '#bfdbfe',
  'sidebar-primary-foreground': '#1e293b',
  'sidebar-accent': '#f1f5f9',
  'sidebar-accent-foreground': '#1e293b',
  'sidebar-border': '#94a3b8',
  'sidebar-ring': '#60a5fa',
};
const defaultHeaderColors: HeaderThemeColors = {
  'header-background': '#ebf5fb',
  'header-foreground': '#1e293b',
  'header-border': '#e2e8f0',
};
const defaultSwimlaneColors: SwimlaneThemeColors = {
    'swimlane-header-background': '#f1f5f9',
    'swimlane-header-foreground': '#475569',
};
const defaultScale = 100;

// --- Helper Functions ---
const applyColorsToDOM = (colors: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  Object.entries(colors).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--${key}`, hexToHsl(value as string));
  });
};

const applyScaleToDOM = (scale: number) => {
    if (typeof window === 'undefined') return;
    document.documentElement.style.fontSize = `${scale}%`;
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
  const [buttonTheme, setButtonTheme] = useState<ButtonThemeColors>(() => getInitialState(BUTTON_THEME_KEY, defaultButtonColors));
  const [cardTheme, setCardTheme] = useState<CardThemeColors>(() => getInitialState(CARD_THEME_KEY, defaultCardColors));
  const [popoverTheme, setPopoverTheme] = useState<PopoverThemeColors>(() => getInitialState(POPOVER_THEME_KEY, defaultPopoverColors));
  const [sidebarTheme, setSidebarTheme] = useState<SidebarThemeColors>(() => getInitialState(SIDEBAR_THEME_KEY, defaultSidebarColors));
  const [headerTheme, setHeaderTheme] = useState<HeaderThemeColors>(() => getInitialState(HEADER_THEME_KEY, defaultHeaderColors));
  const [swimlaneTheme, setSwimlaneTheme] = useState<SwimlaneThemeColors>(() => getInitialState(SWIMLANE_THEME_KEY, defaultSwimlaneColors));
  const [scale, setScaleState] = useState<number>(() => getInitialState(SCALE_KEY, defaultScale));
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>(() => getInitialState(SAVED_THEMES_KEY, []));

  useEffect(() => {
    applyColorsToDOM(theme);
    applyColorsToDOM(buttonTheme);
    applyColorsToDOM(cardTheme);
    applyColorsToDOM(popoverTheme);
    applyColorsToDOM(sidebarTheme);
    applyColorsToDOM(headerTheme);
    applyColorsToDOM(swimlaneTheme);
    applyScaleToDOM(scale);
  }, [theme, buttonTheme, cardTheme, popoverTheme, sidebarTheme, headerTheme, swimlaneTheme, scale]);
  

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

  const setScale = (newScale: number) => {
    setScaleState(newScale);
    localStorage.setItem(SCALE_KEY, JSON.stringify(newScale));
    applyScaleToDOM(newScale);
  };
  
  const setThemeValue = (prop: keyof ThemeColors, value: string) => updateTheme(THEME_KEY, theme, setTheme, prop, value);
  const setButtonThemeValue = (prop: keyof ButtonThemeColors, value: string) => updateTheme(BUTTON_THEME_KEY, buttonTheme, setButtonTheme, prop, value);
  const setCardThemeValue = (prop: keyof CardThemeColors, value: string) => updateTheme(CARD_THEME_KEY, cardTheme, setCardTheme, prop, value);
  const setPopoverThemeValue = (prop: keyof PopoverThemeColors, value: string) => updateTheme(POPOVER_THEME_KEY, popoverTheme, setPopoverTheme, prop, value);
  const setSidebarThemeValue = (prop: keyof SidebarThemeColors, value: string) => updateTheme(SIDEBAR_THEME_KEY, sidebarTheme, setSidebarTheme, prop, value);
  const setHeaderThemeValue = (prop: keyof HeaderThemeColors, value: string) => updateTheme(HEADER_THEME_KEY, headerTheme, setHeaderTheme, prop, value);
  const setSwimlaneThemeValue = (prop: keyof SwimlaneThemeColors, value: string) => updateTheme(SWIMLANE_THEME_KEY, swimlaneTheme, setSwimlaneTheme, prop, value);


  const applySavedTheme = (themeToApply: SavedTheme) => {
    setTheme(themeToApply.colors);
    setButtonTheme(themeToApply.buttonColors || defaultButtonColors);
    setCardTheme(themeToApply.cardColors);
    setPopoverTheme(themeToApply.popoverColors);
    setSidebarTheme(themeToApply.sidebarColors);
    setHeaderTheme(themeToApply.headerColors);
    setSwimlaneTheme(themeToApply.swimlaneColors || defaultSwimlaneColors);
    setScaleState(themeToApply.scale || defaultScale);
    
    applyColorsToDOM(themeToApply.colors);
    applyColorsToDOM(themeToApply.buttonColors || defaultButtonColors);
    applyColorsToDOM(themeToApply.cardColors);
    applyColorsToDOM(themeToApply.popoverColors);
    applyColorsToDOM(themeToApply.sidebarColors);
    applyColorsToDOM(themeToApply.headerColors);
    applyColorsToDOM(themeToApply.swimlaneColors || defaultSwimlaneColors);
    applyScaleToDOM(themeToApply.scale || defaultScale);

    localStorage.setItem(THEME_KEY, JSON.stringify(themeToApply.colors));
    localStorage.setItem(BUTTON_THEME_KEY, JSON.stringify(themeToApply.buttonColors || defaultButtonColors));
    localStorage.setItem(CARD_THEME_KEY, JSON.stringify(themeToApply.cardColors));
    localStorage.setItem(POPOVER_THEME_KEY, JSON.stringify(themeToApply.popoverColors));
    localStorage.setItem(SIDEBAR_THEME_KEY, JSON.stringify(themeToApply.sidebarColors));
    localStorage.setItem(HEADER_THEME_KEY, JSON.stringify(themeToApply.headerColors));
    localStorage.setItem(SWIMLANE_THEME_KEY, JSON.stringify(themeToApply.swimlaneColors || defaultSwimlaneColors));
    localStorage.setItem(SCALE_KEY, JSON.stringify(themeToApply.scale || defaultScale));
  };

  const saveCurrentTheme = (name: string) => {
    const newTheme: SavedTheme = {
      name,
      colors: theme,
      buttonColors: buttonTheme,
      cardColors: cardTheme,
      popoverColors: popoverTheme,
      sidebarColors: sidebarTheme,
      headerColors: headerTheme,
      swimlaneColors: swimlaneTheme,
      scale,
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
    localStorage.removeItem(BUTTON_THEME_KEY);
    localStorage.removeItem(CARD_THEME_KEY);
    localStorage.removeItem(POPOVER_THEME_KEY);
    localStorage.removeItem(SIDEBAR_THEME_KEY);
    localStorage.removeItem(HEADER_THEME_KEY);
    localStorage.removeItem(SWIMLANE_THEME_KEY);
    localStorage.removeItem(SCALE_KEY);
    
    setTheme(defaultColors);
    setButtonTheme(defaultButtonColors);
    setCardTheme(defaultCardColors);
    setPopoverTheme(defaultPopoverColors);
    setSidebarTheme(defaultSidebarColors);
    setHeaderTheme(defaultHeaderColors);
    setSwimlaneTheme(defaultSwimlaneColors);
    setScaleState(defaultScale);

    applyColorsToDOM(defaultColors);
    applyColorsToDOM(defaultButtonColors);
    applyColorsToDOM(defaultCardColors);
    applyColorsToDOM(defaultPopoverColors);
    applyColorsToDOM(defaultSidebarColors);
    applyColorsToDOM(defaultHeaderColors);
    applyColorsToDOM(defaultSwimlaneColors);
    applyScaleToDOM(defaultScale);

    window.location.reload();
  };

  const value = {
    theme,
    setThemeValue,
    buttonTheme,
    setButtonThemeValue,
    cardTheme,
    setCardThemeValue,
    popoverTheme,
    setPopoverThemeValue,
    sidebarTheme,
    setSidebarThemeValue,
    headerTheme,
    setHeaderThemeValue,
    swimlaneTheme,
    setSwimlaneThemeValue,
    scale,
    setScale,
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
