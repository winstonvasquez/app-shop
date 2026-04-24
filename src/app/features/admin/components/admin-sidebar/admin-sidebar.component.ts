import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ThemeService, AppTheme, AVAILABLE_THEMES } from '@core/services/theme/theme';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

interface NavGroup {
  title: string;
  moduleCode: string | null; // null = always visible (no module restriction)
  items: NavItem[];
}

const ALL_NAV_GROUPS: NavGroup[] = [
  {
    title: 'Dashboard',
    moduleCode: null,
    items: [
      { label: 'Resumen General', route: '/admin/dashboard', icon: 'chart' }
    ]
  },
  {
    title: 'Ventas',
    moduleCode: 'VENTAS',
    items: [
      { label: 'Dashboard Ventas', route: '/admin/ventas/dashboard', icon: 'chart-line' },
      { label: 'Pedidos', route: '/admin/orders', icon: 'cart' },
      { label: 'Devoluciones', route: '/admin/returns', icon: 'return' },
      { label: 'Promociones', route: '/admin/promotions', icon: 'tag' }
    ]
  },
  {
    title: 'Compras',
    moduleCode: 'COMPRAS',
    items: [
      { label: 'Dashboard Compras', route: '/admin/compras/dashboard', icon: 'shopping-cart' },
      { label: 'Proveedores', route: '/admin/compras/proveedores', icon: 'factory' },
      { label: 'Órdenes de Compra', route: '/admin/compras/ordenes', icon: 'document' },
      { label: 'Recepción Mercadería', route: '/admin/compras/recepcion', icon: 'truck' }
    ]
  },
  {
    title: 'Logística',
    moduleCode: 'LOGISTICA',
    items: [
      { label: 'Dashboard Logístico',  route: '/admin/logistica/dashboard',      icon: 'truck' },
      { label: 'Almacenes',            route: '/admin/logistica/almacenes',      icon: 'warehouse' },
      { label: 'Inventario',           route: '/admin/logistica/inventario',     icon: 'box' },
      { label: 'Movimientos Stock',    route: '/admin/logistica/movimientos',    icon: 'clipboard' },
      { label: 'Guías de Remisión',    route: '/admin/logistica/guias',          icon: 'document-text' },
      { label: 'Transportistas',       route: '/admin/logistica/transportistas', icon: 'truck' },
      { label: 'Envíos',              route: '/admin/logistica/envios',         icon: 'location' },
      { label: 'Devoluciones',         route: '/admin/logistica/devoluciones',   icon: 'return' },
      { label: 'Tracking',             route: '/admin/logistica/tracking',       icon: 'location' }
    ]
  },
  {
    title: 'Inventario',
    moduleCode: 'INVENTARIO',
    items: [
      { label: 'Dashboard', route: '/admin/inventario/dashboard', icon: 'chart' },
      { label: 'Almacenes', route: '/admin/inventario/almacenes', icon: 'warehouse' },
      { label: 'Ubicaciones', route: '/admin/inventario/ubicaciones', icon: 'location' },
      { label: 'Stock', route: '/admin/inventario/stock', icon: 'box' },
      { label: 'Movimientos',         route: '/admin/inventario/movimientos',    icon: 'clipboard' },
      { label: 'Transferencias',      route: '/admin/inventario/transferencias', icon: 'truck' },
      { label: 'Inventarios Físicos', route: '/admin/inventario/conteos',        icon: 'list' },
      { label: 'Kardex Valorizado',   route: '/admin/inventario/kardex',         icon: 'document' }
    ]
  },
  {
    title: 'Tesorería',
    moduleCode: 'TESORERIA',
    items: [
      { label: 'Dashboard', route: '/admin/tesoreria/dashboard', icon: 'chart' },
      { label: 'Control de Cajas', route: '/admin/tesoreria/cajas', icon: 'credit-card' },
      { label: 'Cuentas Bancarias', route: '/admin/tesoreria/cuentas-bancarias', icon: 'bank' },
      { label: 'Pagos / Workflow', route: '/admin/tesoreria/pagos', icon: 'document' },
      { label: 'Flujo de Caja', route: '/admin/tesoreria/flujo-caja', icon: 'chart-line' }
    ]
  },
  {
    title: 'Contabilidad',
    moduleCode: 'CONTABILIDAD',
    items: [
      { label: 'Dashboard Contable',   route: '/admin/contabilidad/dashboard',         icon: 'book' },
      { label: 'Asientos Contables',   route: '/admin/contabilidad/asientos',          icon: 'document-text' },
      { label: 'Plan de Cuentas PCGE', route: '/admin/contabilidad/plan-cuentas',      icon: 'list' },
      { label: 'Libro Diario',         route: '/admin/contabilidad/diario',            icon: 'book-open' },
      { label: 'Libro Mayor',          route: '/admin/contabilidad/libro-mayor',       icon: 'book-open' },
      { label: 'Balance General',      route: '/admin/contabilidad/balance',           icon: 'chart' },
      { label: 'Estado de Resultados', route: '/admin/contabilidad/estado-resultados', icon: 'chart-line' },
      { label: 'Registro Ventas',      route: '/admin/contabilidad/ventas',            icon: 'table' },
      { label: 'Registro Compras',     route: '/admin/contabilidad/compras',           icon: 'table' },
      { label: 'Declaración IGV',      route: '/admin/contabilidad/igv',               icon: 'calculator' }
    ]
  },
  {
    title: 'RRHH',
    moduleCode: 'RRHH',
    items: [
      { label: 'Empleados',       route: '/admin/rrhh/employees',   icon: 'users'     },
      { label: 'Asistencia',      route: '/admin/rrhh/attendance',  icon: 'calendar'  },
      { label: 'Vacaciones',      route: '/admin/rrhh/vacations',   icon: 'sun'       },
      { label: 'Nómina',          route: '/admin/rrhh/payroll',     icon: 'document'  },
      { label: 'Boleta de Pago',  route: '/admin/rrhh/boleta',      icon: 'file'      },
      { label: 'Evaluaciones',    route: '/admin/rrhh/evaluations', icon: 'chart-bar' },
      { label: 'Capacitaciones',  route: '/admin/rrhh/trainings',   icon: 'book'      }
    ]
  },
  {
    title: 'Punto de Venta',
    moduleCode: 'POS',
    items: [
      { label: 'Abrir POS', route: '/pos', icon: 'cash-register' },
      { label: 'Devoluciones', route: '/pos/devoluciones', icon: 'return' }
    ]
  },
  {
    title: 'Clientes',
    moduleCode: null,
    items: [
      { label: 'Lista de Clientes', route: '/admin/customers', icon: 'users' },
      { label: 'Segmentos', route: '/admin/segments', icon: 'user-group' }
    ]
  },
  {
    title: 'Empresas',
    moduleCode: null,
    items: [
      { label: 'Empresas', route: '/admin/companies', icon: 'building' }
    ]
  },
  {
    title: 'Configuración Visual',
    moduleCode: null,
    items: [
      { label: 'Temas por Módulo',  route: '/admin/store-theme',     icon: 'sliders'    },
      { label: 'Apariencia',        route: '/admin/apariencia',      icon: 'paint'      },
      { label: 'Footer',            route: '/admin/footer-manager',  icon: 'layout'     },
      { label: 'Slider / Banners',  route: '/admin/slider-manager',  icon: 'image'      },
      { label: 'Parámetros Sistema', route: '/admin/general-config', icon: 'database'   }
    ]
  },
  {
    title: 'Reportes',
    moduleCode: null,
    items: [
      { label: 'Dashboard Ejecutivo', route: '/admin/reports/ejecutivo', icon: 'chart-bar' },
      { label: 'Reporte de Inventario', route: '/admin/reports/inventory', icon: 'document' },
      { label: 'Reporte de Clientes', route: '/admin/reports/customers', icon: 'user-chart' },
      { label: 'Reporte de Ventas', route: '/admin/reports/ventas', icon: 'chart-line' },
      { label: 'Reporte RRHH', route: '/admin/reports/rrhh', icon: 'users' }
    ]
  }
];

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss'
})
export class AdminSidebarComponent {
  private readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);

  readonly themePickerOpen = signal(false);

  /** Temas disponibles agrupados por categoría para el picker del sidebar. */
  readonly themeGroups = [
      { label: 'Tienda (claros)',    themes: AVAILABLE_THEMES.filter(t => t.category === 'default'   && t.mode === 'light') },
      { label: 'Estacionales',       themes: AVAILABLE_THEMES.filter(t => t.category === 'seasonal') },
      { label: 'Profesionales',      themes: AVAILABLE_THEMES.filter(t => t.category === 'professional') },
      { label: 'Oscuros',            themes: AVAILABLE_THEMES.filter(t => t.category === 'default'   && t.mode === 'dark') },
  ];

  readonly activeNavGroups = computed(() => {
    const modules = this.authService.enabledModules();
    // Backward compatibility: if no modules configured, show all groups
    if (modules.length === 0) {
      return ALL_NAV_GROUPS;
    }
    return ALL_NAV_GROUPS.filter(group =>
      group.moduleCode === null || modules.includes(group.moduleCode)
    );
  });

  // Keep navGroups for backward compatibility with any template references
  get navGroups(): NavGroup[] {
    return this.activeNavGroups();
  }

  getIconPath(icon: string): string {
    const icons: Record<string, string> = {
      'chart': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      'chart-line': 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
      'shopping-cart': 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
      'factory': 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      'truck': 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
      'document': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'document-text': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2zM8 7V4m0 0H4m4 0v4m4-4h4',
      'warehouse': 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
      'location': 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
      'book': 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      'book-open': 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      'calculator': 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      'table': 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      'tag': 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
      'box': 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      'clipboard': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      'cart': 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
      'credit-card': 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
      'return': 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
      'users': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      'user-group': 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      'building': 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      'settings': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      'database': 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
      'sliders': 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
      'chart-bar': 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'file': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'user-chart': 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      'list': 'M4 6h16M4 10h16M4 14h16M4 18h16',
      'sun': 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z',
      'cash-register': 'M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4',
      'paint': 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
      'layout': 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
      'image': 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
    };
    return icons[icon] || icons['chart'];
  }
}
