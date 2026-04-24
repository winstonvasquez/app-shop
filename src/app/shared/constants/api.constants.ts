/**
 * API Constants
 * Constantes para endpoints y configuración de API
 */

export const API_ENDPOINTS = {
  // Auth
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    profile: '/api/auth/profile',
  },
  
  // Users
  users: {
    base: '/api/users',
    byId: (id: number) => `/api/users/${id}`,
    companies: (userId: number) => `/api/users/${userId}/companies`,
  },
  
  // Products
  products: {
    base: '/api/products',
    byId: (id: number) => `/api/products/${id}`,
    search: '/api/products/search',
    categories: '/api/products/categories',
  },
  
  // Inventory
  inventory: {
    base: '/api/inventory',
    byId: (id: number) => `/api/inventory/${id}`,
    movements: '/api/inventory/movements',
    stock: '/api/inventory/stock',
    warehouses: '/api/inventory/warehouses',
  },
  
  // Logistics
  logistics: {
    base: '/api/logistics',
    warehouses: '/api/logistics/warehouses',
    movements: '/api/logistics/movements',
    transfers: '/api/logistics/transfers',
  },
  
  // Purchases
  purchases: {
    base: '/api/purchases',
    orders: '/api/purchases/orders',
    suppliers: '/api/purchases/suppliers',
    receptions: '/api/purchases/receptions',
    dashboard: '/api/purchases/dashboard',
  },
  
  // Accounting
  accounting: {
    base: '/api/accounting',
    entries: '/api/accounting/entries',
    accounts: '/api/accounting/accounts',
    reports: '/api/accounting/reports',
  },
  
  // RRHH
  rrhh: {
    base: '/hr/api',
    employees: '/hr/api/employees',
    attendance: '/hr/api/attendance',
    vacations: '/hr/api/vacations',
    payroll: '/hr/api/payroll',
    evaluations: '/hr/api/evaluations',
    departments: '/hr/api/departments',
    positions: '/hr/api/positions',
  },
  
  // Orders
  orders: {
    base: '/api/orders',
    byId: (id: number) => `/api/orders/${id}`,
    create: '/api/orders',
    history: '/api/orders/history',
  },
  
  // Cart
  cart: {
    base: '/api/cart',
    add: '/api/cart/add',
    remove: '/api/cart/remove',
    update: '/api/cart/update',
    clear: '/api/cart/clear',
  },
  
  // Admin
  admin: {
    users: '/api/admin/users',
    roles: '/api/admin/roles',
    companies: '/api/admin/companies',
    settings: '/api/admin/settings',
  },
} as const;

export const API_CONFIG = {
  timeout: 30000, // 30 segundos
  retryAttempts: 3,
  retryDelay: 1000, // 1 segundo
  headers: {
    contentType: 'application/json',
    accept: 'application/json',
  },
} as const;

export const API_ERRORS = {
  network: 'network_error',
  timeout: 'timeout_error',
  unauthorized: 'unauthorized_error',
  forbidden: 'forbidden_error',
  notFound: 'not_found_error',
  serverError: 'server_error',
  validationError: 'validation_error',
  unknown: 'unknown_error',
} as const;
