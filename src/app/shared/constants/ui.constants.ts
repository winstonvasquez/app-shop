/**
 * UI Constants
 * Constantes para elementos de interfaz de usuario
 */

export const NOTIFICATION_DURATION = {
  short: 2000,
  medium: 3000,
  long: 5000,
  veryLong: 8000,
} as const;

export const NOTIFICATION_TYPES = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
} as const;

export const MODAL_SIZES = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
  extraLarge: 'xl',
  fullScreen: 'full',
} as const;

export const BUTTON_VARIANTS = {
  primary: 'primary',
  secondary: 'secondary',
  success: 'success',
  danger: 'danger',
  warning: 'warning',
  info: 'info',
  ghost: 'ghost',
  link: 'link',
} as const;

export const BUTTON_SIZES = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
} as const;

export const TABLE_ACTIONS = {
  view: 'view',
  edit: 'edit',
  delete: 'delete',
  approve: 'approve',
  reject: 'reject',
  download: 'download',
  print: 'print',
} as const;

export const LOADING_STATES = {
  idle: 'idle',
  loading: 'loading',
  success: 'success',
  error: 'error',
} as const;

export const SORT_DIRECTIONS = {
  asc: 'asc',
  desc: 'desc',
} as const;

export const FILTER_OPERATORS = {
  equals: 'eq',
  notEquals: 'ne',
  contains: 'contains',
  startsWith: 'startsWith',
  endsWith: 'endsWith',
  greaterThan: 'gt',
  greaterThanOrEqual: 'gte',
  lessThan: 'lt',
  lessThanOrEqual: 'lte',
  between: 'between',
  in: 'in',
  notIn: 'notIn',
} as const;

export const DATE_PICKER_MODES = {
  single: 'single',
  range: 'range',
  multiple: 'multiple',
} as const;

export const CALENDAR_VIEWS = {
  day: 'day',
  week: 'week',
  month: 'month',
  year: 'year',
} as const;

export const ICON_SIZES = {
  xs: '12px',
  sm: '16px',
  md: '20px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
} as const;

export const ANIMATION_DURATIONS = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
} as const;

export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;
