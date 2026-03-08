/**
 * Theme Constants
 * Configuración centralizada de tema para toda la aplicación
 */

export const THEME_COLORS = {
  // Primary colors (azul)
  primary: {
    DEFAULT: '#3b82f6',
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  // Secondary colors (gris)
  secondary: {
    DEFAULT: '#6b7280',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
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
  sm: '0.25rem',   // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
} as const;

export const THEME_FONTS = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
} as const;

export const THEME_BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Aplica las variables CSS del tema al documento
 */
export function applyTheme(): void {
  const root = document.documentElement;
  
  // Primary colors
  Object.entries(THEME_COLORS.primary).forEach(([key, value]) => {
    const varName = key === 'DEFAULT' ? '--color-primary' : `--color-primary-${key}`;
    root.style.setProperty(varName, value);
  });
  
  // Secondary colors
  Object.entries(THEME_COLORS.secondary).forEach(([key, value]) => {
    const varName = key === 'DEFAULT' ? '--color-secondary' : `--color-secondary-${key}`;
    root.style.setProperty(varName, value);
  });
  
  // Status colors
  root.style.setProperty('--color-success', THEME_COLORS.success);
  root.style.setProperty('--color-warning', THEME_COLORS.warning);
  root.style.setProperty('--color-error', THEME_COLORS.error);
  root.style.setProperty('--color-info', THEME_COLORS.info);
  
  // Spacing
  Object.entries(THEME_SPACING).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });
  
  // Border radius
  Object.entries(THEME_BORDER_RADIUS).forEach(([key, value]) => {
    root.style.setProperty(`--border-radius-${key}`, value);
  });
  
  // Fonts
  Object.entries(THEME_FONTS).forEach(([key, value]) => {
    root.style.setProperty(`--font-family-${key}`, value);
  });
}
