/**
 * Application Constants
 * Constantes globales de la aplicación
 */

export const APP_CONFIG = {
  name: 'MicroShop ERP',
  version: '2.0.0',
  defaultLanguage: 'es',
  supportedLanguages: ['es', 'en'],
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  dateTimeFormat: 'dd/MM/yyyy HH:mm',
  currency: 'PEN',
  currencySymbol: 'S/',
  itemsPerPage: 10,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
} as const;

export const STORAGE_KEYS = {
  token: 'auth_token',
  refreshToken: 'refresh_token',
  user: 'current_user',
  language: 'app_language',
  theme: 'app_theme',
  cart: 'shopping_cart',
  companyId: 'company_id',
  tenantId: 'tenant_id',
} as const;

export const ROUTES = {
  home: '/',
  login: '/auth/login',
  register: '/auth/register',
  dashboard: '/dashboard',
  admin: '/admin',
  inventory: '/inventory',
  logistics: '/logistics',
  purchases: '/compras',
  accounting: '/contabilidad',
  rrhh: '/rrhh',
  pos: '/pos',
  products: '/products',
  cart: '/cart',
  checkout: '/checkout',
} as const;

export const ROLES = {
  admin: 'ADMIN',
  user: 'USER',
  manager: 'MANAGER',
  employee: 'EMPLOYEE',
  guest: 'GUEST',
} as const;

export const PERMISSIONS = {
  // Inventory
  inventoryView: 'inventory:view',
  inventoryCreate: 'inventory:create',
  inventoryUpdate: 'inventory:update',
  inventoryDelete: 'inventory:delete',
  
  // Logistics
  logisticsView: 'logistics:view',
  logisticsCreate: 'logistics:create',
  logisticsUpdate: 'logistics:update',
  logisticsDelete: 'logistics:delete',
  
  // Purchases
  purchasesView: 'purchases:view',
  purchasesCreate: 'purchases:create',
  purchasesApprove: 'purchases:approve',
  
  // Accounting
  accountingView: 'accounting:view',
  accountingCreate: 'accounting:create',
  accountingClose: 'accounting:close',
  
  // RRHH
  rrhhView: 'rrhh:view',
  rrhhCreate: 'rrhh:create',
  rrhhUpdate: 'rrhh:update',
  rrhhApprove: 'rrhh:approve',
  
  // Admin
  adminUsers: 'admin:users',
  adminRoles: 'admin:roles',
  adminSettings: 'admin:settings',
} as const;

export const VALIDATION = {
  minPasswordLength: 8,
  maxPasswordLength: 128,
  minUsernameLength: 3,
  maxUsernameLength: 50,
  emailPattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phonePattern: /^\+?[1-9]\d{1,14}$/,
  documentPattern: /^\d{8,11}$/,
} as const;

export const PAGINATION = {
  defaultPage: 1,
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 25, 50, 100],
  maxPageSize: 100,
} as const;

export const HTTP_STATUS = {
  ok: 200,
  created: 201,
  noContent: 204,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  internalServerError: 500,
  serviceUnavailable: 503,
} as const;
