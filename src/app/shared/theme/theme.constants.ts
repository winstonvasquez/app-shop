/**
 * Theme Constants — Sistema de Diseño Confianza
 *
 * NOTA: La fuente de verdad de los tokens son los CSS custom properties
 * declarados en `styles/themes/_default.scss` (cargados vía `styles.scss`).
 * Este archivo expone las mismas constantes en TypeScript para componentes
 * que necesiten leer paleta sin depender del DOM (ej. Chart.js, Lucide, etc.).
 */

export const THEME_COLORS = {
  /** Brand primary — ink blue (Trust, Amazon-style). */
  primary: {
    DEFAULT: '#0B3D91',
    50:  '#E6ECF7',
    100: '#C2D0EC',
    200: '#9BB1DD',
    300: '#7593CE',
    400: '#4F75BF',
    500: '#0B3D91',
    600: '#0A3782',
    700: '#082E6F',
    800: '#062A6B',
    900: '#04204F',
  },
  /** Secondary — neutros cálidos del DS Confianza. */
  secondary: {
    DEFAULT: '#5A6473',
    50:  '#F7F6F3',
    100: '#EFEDE7',
    200: '#DCD8CE',
    300: '#C5BFAF',
    400: '#8C95A3',
    500: '#5A6473',
    600: '#454D5C',
    700: '#323845',
    800: '#1F2530',
    900: '#0E1B2C',
  },
  /** Acento — naranja Amazon-style CTA. */
  accent: '#F08C00',
  /** Estados semánticos. */
  success: '#0E8A5F',
  warning: '#B45309',
  error:   '#C0392B',
  info:    '#0B6FB8',
} as const;

export const THEME_SPACING = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
} as const;

export const THEME_BORDER_RADIUS = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
} as const;

export const THEME_FONTS = {
  sans:    '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  display: '"Source Serif 4", "Inter", Georgia, serif',
  mono:    '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
} as const;

export const THEME_BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;
