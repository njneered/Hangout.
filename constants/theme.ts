/**
 * constants/theme.ts
 * ─────────────────────────────────────────────────────────────
 * Full theme system for Hangout — dark (default) + light mode.
 * Import DARK_THEME / LIGHT_THEME directly, or use the
 * useTheme() hook from providers/ThemeProvider.tsx for
 * reactive switching.
 *
 * Color palette (light mode inspired by mockup):
 *   Gold accent:   #FACC15 / #FDE68A / #F59E0B
 *   Warm cream bg: #FFFBF0
 *   Soft cards:    #FFFFFF with warm border
 *   Purple accent kept for consistency
 */

import { Platform } from 'react-native';

export type AppTheme = typeof DARK_THEME;

export const DARK_THEME = {
  // ── Backgrounds ──
  bg:          '#0f0a1f',
  bgSecondary: '#1a1333',

  // ── Cards ──
  card:       'rgba(30,24,56,0.6)',
  cardBorder: 'rgba(139,92,246,0.2)',

  // ── Gold / CTA ──
  gold:    '#facc15',
  goldDim: 'rgba(250,204,21,0.1)',
  goldMid: '#f59e0b',

  // ── Purple ──
  purple:      '#8b5cf6',
  purpleLight: '#c4b5fd',
  purpleMuted: '#a78bfa',
  purpleDim:   'rgba(139,92,246,0.15)',
  purpleActive:'rgba(139,92,246,0.35)',

  // ── Semantic ──
  red:      '#ef4444',
  redDim:   'rgba(239,68,68,0.12)',
  green:    '#10b981',
  greenDim: 'rgba(16,185,129,0.15)',

  // ── Text ──
  text:     '#e8e4f3',
  textSub:  '#c4b5fd',
  textMuted:'#a78bfa',

  // ── Misc ──
  isDark: true,
};

export const LIGHT_THEME: AppTheme = {
  // ── Backgrounds ──
  bg:          '#FFFBF0',   // warm cream
  bgSecondary: '#FEF3C7',   // soft yellow tint

  // ── Cards ──
  card:       '#FFFFFF',
  cardBorder: 'rgba(245,158,11,0.25)',  // warm gold border

  // ── Gold / CTA ──
  gold:    '#F59E0B',   // slightly deeper gold for light bg contrast
  goldDim: 'rgba(245,158,11,0.12)',
  goldMid: '#FACC15',

  // ── Purple ──
  purple:      '#7C3AED',   // slightly deeper for light bg
  purpleLight: '#8B5CF6',
  purpleMuted: '#A78BFA',
  purpleDim:   'rgba(124,58,237,0.1)',
  purpleActive:'rgba(124,58,237,0.2)',

  // ── Semantic ──
  red:      '#EF4444',
  redDim:   'rgba(239,68,68,0.1)',
  green:    '#059669',
  greenDim: 'rgba(5,150,105,0.12)',

  // ── Text ──
  text:     '#1C1917',   // near-black warm
  textSub:  '#78350F',   // warm brown
  textMuted:'#92400E',   // muted warm brown

  // ── Misc ──
  isDark: false,
};

// ── Legacy export (dark only — for files not yet migrated) ──
export const EVENTTHEME = DARK_THEME;

// ── Tab bar / system colors ──
export const Colors = {
  light: {
    text:            LIGHT_THEME.text,
    background:      LIGHT_THEME.bg,
    tint:            LIGHT_THEME.gold,
    icon:            LIGHT_THEME.textMuted,
    tabIconDefault:  LIGHT_THEME.textMuted,
    tabIconSelected: LIGHT_THEME.gold,
  },
  dark: {
    text:            DARK_THEME.text,
    background:      DARK_THEME.bg,
    tint:            DARK_THEME.gold,
    icon:            DARK_THEME.textMuted,
    tabIconDefault:  DARK_THEME.textMuted,
    tabIconSelected: DARK_THEME.gold,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});