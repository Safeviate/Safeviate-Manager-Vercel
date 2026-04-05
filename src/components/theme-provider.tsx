'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { hexToHsl } from '@/lib/utils';
import { useTenantConfig } from '@/hooks/use-tenant-config';

// --- Types ---
type ThemeColors = {
  background: string;
  primary: string;
  'primary-foreground': string;
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
  'card-border': string;
};

type PopoverThemeColors = {
  popover: string;
  'popover-foreground': string;
  'popover-accent': string;
  'popover-accent-foreground': string;
};

type SidebarThemeColors = {
  'sidebar-background': string;
  'sidebar-foreground': string;
  'sidebar-accent': string;
  'sidebar-accent-foreground': string;
  'sidebar-border': string;
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

type MatrixThemeColors = {
  'matrix-header-background': string;
  'matrix-header-foreground': string;
  'matrix-subheader-background': string;
  'matrix-subheader-foreground': string;
};

export type SavedTheme = {
  name: string;
  colors: ThemeColors;
  buttonColors: ButtonThemeColors;
  cardColors: CardThemeColors;
  sidebarColors: SidebarThemeColors;
  sidebarBackgroundImage?: string;
  headerColors: HeaderThemeColors;
  popoverColors: PopoverThemeColors;
  swimlaneColors: SwimlaneThemeColors;
  matrixColors: MatrixThemeColors;
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
  sidebarBackgroundImage: string;
  setSidebarBackgroundImage: (value: string) => void;
  headerTheme: HeaderThemeColors;
  setHeaderThemeValue: (key: keyof HeaderThemeColors, value: string) => void;
  swimlaneTheme: SwimlaneThemeColors;
  setSwimlaneThemeValue: (key: keyof SwimlaneThemeColors, value: string) => void;
  matrixTheme: MatrixThemeColors;
  setMatrixThemeValue: (key: keyof MatrixThemeColors, value: string) => void;
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
export const SIDEBAR_BACKGROUND_IMAGE_KEY = 'safeviate-sidebar-background-image';
export const HEADER_THEME_KEY = 'safeviate-header-theme';
export const SWIMLANE_THEME_KEY = 'safeviate-swimlane-theme';
export const MATRIX_THEME_KEY = 'safeviate-matrix-theme';
export const SCALE_KEY = 'safeviate-scale';
export const SAVED_THEMES_KEY = 'safeviate-saved-themes';

// --- Default Values ---
const defaultColors: ThemeColors = {
  background: '#ebf5fb',
  primary: '#7cc4f7',
  'primary-foreground': '#1e293b',
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
  'card-border': '#d1d5db',
};
const defaultPopoverColors: PopoverThemeColors = {
    popover: '#ebf5fb',
    'popover-foreground': '#1e293b',
    'popover-accent': '#7cc4f7',
    'popover-accent-foreground': '#1e293b',
};
const defaultSidebarColors: SidebarThemeColors = {
  'sidebar-background': '#dbeafb',
  'sidebar-foreground': '#1e293b',
  'sidebar-accent': '#f1f5f9',
  'sidebar-accent-foreground': '#1e293b',
  'sidebar-border': '#94a3b8',
};
const defaultSidebarBackgroundImage = '/safeviate-background.png';
const legacySidebarBackgroundImage = '/sidebar-background.png';
const defaultHeaderColors: HeaderThemeColors = {
  'header-background': '#171514',
  'header-foreground': '#f3efe8',
  'header-border': '#3a312b',
};
const defaultSwimlaneColors: SwimlaneThemeColors = {
    'swimlane-header-background': '#f1f5f9',
    'swimlane-header-foreground': '#475569',
};
const defaultMatrixColors: MatrixThemeColors = {
    'matrix-header-background': '#e0f2fe',
    'matrix-header-foreground': '#1e293b',
    'matrix-subheader-background': '#f8fafc',
    'matrix-subheader-foreground': '#1e293b',
};
const defaultScale = 100;

// --- Helper Functions ---
const applyColorsToDOM = (colors: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  Object.entries(colors).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--${key}`, hexToHsl(value as string));
  });
};

const applySidebarBackgroundImageToDOM = (value: string) => {
  if (typeof window === 'undefined') return;
  document.documentElement.style.setProperty(
    '--sidebar-background-image',
    value ? `url("${value}")` : 'none'
  );
};

const applyScaleToDOM = (scale: number) => {
    if (typeof window === 'undefined') return;
    document.documentElement.style.fontSize = `${scale}%`;
};

function getInitialState<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') {
        return defaultValue;
    }
    try {
        const item = window.localStorage.getItem(key);
        if (item === null) {
            return defaultValue;
        }
        const trimmed = item.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('"') && trimmed !== 'null' && trimmed !== 'true' && trimmed !== 'false' && !/^[-\d]/.test(trimmed)) {
            return defaultValue;
        }
        const stored = JSON.parse(trimmed);

        // Strict picking: only allow keys that exist in the default definition
        if (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue)) {
             const result: any = { ...defaultValue };
             Object.keys(defaultValue).forEach(k => {
                 if (stored[k] !== undefined) {
                     result[k] = stored[k];
                 }
             });
             return result;
        }
        
        return stored as T;
    } catch (error) {
        console.warn(`Error reading localStorage key “${key}”:`, error);
        return defaultValue;
    }
}

const getSavedThemesStorageKey = (tenantId: string | null | undefined) =>
  tenantId ? `${SAVED_THEMES_KEY}:${tenantId}` : SAVED_THEMES_KEY;

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<ThemeColors>(defaultColors);
  const [buttonTheme, setButtonTheme] = useState<ButtonThemeColors>(defaultButtonColors);
  const [cardTheme, setCardTheme] = useState<CardThemeColors>(defaultCardColors);
  const [popoverTheme, setPopoverTheme] = useState<PopoverThemeColors>(defaultPopoverColors);
  const [sidebarTheme, setSidebarTheme] = useState<SidebarThemeColors>(defaultSidebarColors);
  const [sidebarBackgroundImage, setSidebarBackgroundImageState] = useState<string>(defaultSidebarBackgroundImage);
  const [headerTheme, setHeaderTheme] = useState<HeaderThemeColors>(defaultHeaderColors);
  const [swimlaneTheme, setSwimlaneTheme] = useState<SwimlaneThemeColors>(defaultSwimlaneColors);
  const [matrixTheme, setMatrixTheme] = useState<MatrixThemeColors>(defaultMatrixColors);
  const [scale, setScaleState] = useState<number>(defaultScale);
  // Browser-only presets for the current tenant, separate from shared tenant branding.
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([]);

  const { tenant, tenantId } = useTenantConfig();

  const normalizeMatrixTheme = (source: Record<string, string> | undefined | null): MatrixThemeColors => ({
    ...defaultMatrixColors,
    'matrix-header-background': source?.['matrix-header-background'] || source?.['matrix-header-start'] || defaultMatrixColors['matrix-header-background'],
    'matrix-header-foreground': source?.['matrix-header-foreground'] || defaultMatrixColors['matrix-header-foreground'],
    'matrix-subheader-background': source?.['matrix-subheader-background'] || source?.['matrix-subheader-start'] || defaultMatrixColors['matrix-subheader-background'],
    'matrix-subheader-foreground': source?.['matrix-subheader-foreground'] || defaultMatrixColors['matrix-subheader-foreground'],
  });

  // --- Auto-sync with shared tenant branding ---
  useEffect(() => {
    const nextTheme = {
      ...defaultColors,
      ...(tenant?.theme?.main || {}),
    };
    const nextButtonTheme = {
      ...defaultButtonColors,
      ...(tenant?.theme?.button || {}),
    };
    const nextCardTheme = {
      ...defaultCardColors,
      ...(tenant?.theme?.card || {}),
    };
    const nextPopoverTheme = {
      ...defaultPopoverColors,
      ...(tenant?.theme?.popover || {}),
    };
    const nextSidebarTheme = {
      ...defaultSidebarColors,
      ...(tenant?.theme?.sidebar || {}),
    };
    const nextHeaderTheme = {
      ...defaultHeaderColors,
      ...(tenant?.theme?.header || {}),
    };
    const nextSwimlaneTheme = {
      ...defaultSwimlaneColors,
      ...(tenant?.theme?.swimlane || {}),
    };
    const nextMatrixTheme = normalizeMatrixTheme({
      ...(tenant?.theme?.matrix || {}),
    });
    const nextSidebarBackgroundImage =
      tenant?.theme?.sidebarBackgroundImage || defaultSidebarBackgroundImage;
    const nextScale = defaultScale;
    const nextSavedThemes = getInitialState<SavedTheme[]>(
      getSavedThemesStorageKey(tenantId),
      []
    );

    setTheme(nextTheme);
    setButtonTheme(nextButtonTheme);
    setCardTheme(nextCardTheme);
    setPopoverTheme(nextPopoverTheme);
    setSidebarTheme(nextSidebarTheme);
    setSidebarBackgroundImageState(nextSidebarBackgroundImage);
    setHeaderTheme(nextHeaderTheme);
    setSwimlaneTheme(nextSwimlaneTheme);
    setMatrixTheme(nextMatrixTheme);
    setScaleState(nextScale);
    setSavedThemes(nextSavedThemes);
  }, [tenant?.theme]);

  useEffect(() => {
    applyColorsToDOM(theme);
    applyColorsToDOM(buttonTheme);
    applyColorsToDOM(cardTheme);
    applyColorsToDOM(popoverTheme);
    applyColorsToDOM(sidebarTheme);
    applySidebarBackgroundImageToDOM(sidebarBackgroundImage);
    applyColorsToDOM(headerTheme);
    applyColorsToDOM(swimlaneTheme);
    applyColorsToDOM(matrixTheme);
    applyScaleToDOM(scale);
  }, [theme, buttonTheme, cardTheme, popoverTheme, sidebarTheme, sidebarBackgroundImage, headerTheme, swimlaneTheme, matrixTheme, scale]);
  

  const updateTheme = <T extends object>(
    state: T,
    setter: React.Dispatch<React.SetStateAction<T>>,
    prop: keyof T,
    value: string
  ) => {
    const newTheme = { ...state, [prop]: value };
    setter(newTheme);
    document.documentElement.style.setProperty(`--${String(prop)}`, hexToHsl(value));
  };

  const setScale = (newScale: number) => {
    setScaleState(newScale);
    applyScaleToDOM(newScale);
  };
  
  const setThemeValue = (prop: keyof ThemeColors, value: string) => updateTheme(theme, setTheme, prop, value);
  const setButtonThemeValue = (prop: keyof ButtonThemeColors, value: string) => updateTheme(buttonTheme, setButtonTheme, prop, value);
  const setCardThemeValue = (prop: keyof CardThemeColors, value: string) => updateTheme(cardTheme, setCardTheme, prop, value);
  const setPopoverThemeValue = (prop: keyof PopoverThemeColors, value: string) => updateTheme(popoverTheme, setPopoverTheme, prop, value);
  const setSidebarThemeValue = (prop: keyof SidebarThemeColors, value: string) => updateTheme(sidebarTheme, setSidebarTheme, prop, value);
  const setSidebarBackgroundImage = (value: string) => {
    setSidebarBackgroundImageState(value);
    applySidebarBackgroundImageToDOM(value);
  };
  const setHeaderThemeValue = (prop: keyof HeaderThemeColors, value: string) => updateTheme(headerTheme, setHeaderTheme, prop, value);
  const setSwimlaneThemeValue = (prop: keyof SwimlaneThemeColors, value: string) => updateTheme(swimlaneTheme, setSwimlaneTheme, prop, value);
  const setMatrixThemeValue = (prop: keyof MatrixThemeColors, value: string) => updateTheme(matrixTheme, setMatrixTheme, prop, value);


  const applySavedTheme = (themeToApply: SavedTheme) => {
    const newTheme = { ...defaultColors, ...themeToApply.colors };
    const newButtonTheme = { ...defaultButtonColors, ...themeToApply.buttonColors };
    const newCardTheme = { ...defaultCardColors, ...themeToApply.cardColors };
    
    // Strict picking for sidebar and popover to avoid redundant keys
    const newPopoverTheme = { ...defaultPopoverColors };
    Object.keys(defaultPopoverColors).forEach(k => {
        if ((themeToApply.popoverColors as any)[k]) (newPopoverTheme as any)[k] = (themeToApply.popoverColors as any)[k];
    });

    const newSidebarTheme = { ...defaultSidebarColors };
    Object.keys(defaultSidebarColors).forEach(k => {
        if ((themeToApply.sidebarColors as any)[k]) (newSidebarTheme as any)[k] = (themeToApply.sidebarColors as any)[k];
    });
    const newSidebarBackgroundImage = themeToApply.sidebarBackgroundImage || defaultSidebarBackgroundImage;

    const newHeaderTheme = { ...defaultHeaderColors, ...themeToApply.headerColors };
    const newSwimlaneTheme = { ...defaultSwimlaneColors, ...themeToApply.swimlaneColors };
    const newMatrixTheme = normalizeMatrixTheme(themeToApply.matrixColors as Record<string, string>);
    const newScale = themeToApply.scale || defaultScale;

    setTheme(newTheme);
    setButtonTheme(newButtonTheme);
    setCardTheme(newCardTheme);
    setPopoverTheme(newPopoverTheme);
    setSidebarTheme(newSidebarTheme);
    setSidebarBackgroundImageState(newSidebarBackgroundImage);
    setHeaderTheme(newHeaderTheme);
    setSwimlaneTheme(newSwimlaneTheme);
    setMatrixTheme(newMatrixTheme);
    setScaleState(newScale);
    
    applyColorsToDOM(newTheme);
    applyColorsToDOM(newButtonTheme);
    applyColorsToDOM(newCardTheme);
    applyColorsToDOM(newPopoverTheme);
    applyColorsToDOM(newSidebarTheme);
    applySidebarBackgroundImageToDOM(newSidebarBackgroundImage);
    applyColorsToDOM(newHeaderTheme);
    applyColorsToDOM(newSwimlaneTheme);
    applyColorsToDOM(newMatrixTheme);
    applyScaleToDOM(newScale);
  };

  const saveCurrentTheme = (name: string) => {
    const newTheme: SavedTheme = {
      name,
      colors: theme,
      buttonColors: buttonTheme,
      cardColors: cardTheme,
      popoverColors: popoverTheme,
      sidebarColors: sidebarTheme,
      sidebarBackgroundImage,
      headerColors: headerTheme,
      swimlaneColors: swimlaneTheme,
      matrixColors: matrixTheme,
      scale,
    };
    const updatedSavedThemes = [...savedThemes, newTheme];
    setSavedThemes(updatedSavedThemes);
    try {
      window.localStorage.setItem(getSavedThemesStorageKey(tenantId), JSON.stringify(updatedSavedThemes));
    } catch {
      // Ignore storage failures (private mode, quota limits, restricted browsers).
    }
  };
  
  const deleteSavedTheme = (name: string) => {
      const updatedSavedThemes = savedThemes.filter(t => t.name !== name);
      setSavedThemes(updatedSavedThemes);
      try {
        window.localStorage.setItem(getSavedThemesStorageKey(tenantId), JSON.stringify(updatedSavedThemes));
      } catch {
        // Ignore storage failures (private mode, quota limits, restricted browsers).
      }
  }

  const resetToDefaults = () => {
    setTheme({
      ...defaultColors,
      ...(tenant?.theme?.main || {}),
    });
    setButtonTheme({
      ...defaultButtonColors,
      ...(tenant?.theme?.button || {}),
    });
    setCardTheme({
      ...defaultCardColors,
      ...(tenant?.theme?.card || {}),
    });
    setPopoverTheme({
      ...defaultPopoverColors,
      ...(tenant?.theme?.popover || {}),
    });
    setSidebarTheme({
      ...defaultSidebarColors,
      ...(tenant?.theme?.sidebar || {}),
    });
    setSidebarBackgroundImageState(tenant?.theme?.sidebarBackgroundImage || defaultSidebarBackgroundImage);
    setHeaderTheme({
      ...defaultHeaderColors,
      ...(tenant?.theme?.header || {}),
    });
    setSwimlaneTheme({
      ...defaultSwimlaneColors,
      ...(tenant?.theme?.swimlane || {}),
    });
    setMatrixTheme(normalizeMatrixTheme(tenant?.theme?.matrix || {}));
    setScaleState(defaultScale);
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
    sidebarBackgroundImage,
    setSidebarBackgroundImage,
    headerTheme,
    setHeaderThemeValue,
    swimlaneTheme,
    setSwimlaneThemeValue,
    matrixTheme,
    setMatrixThemeValue,
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
