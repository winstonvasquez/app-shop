/**
 * Mapa de navegación del ERP — GENERADO desde ALL_NAV_GROUPS de
 * src/app/features/admin/components/admin-sidebar/admin-sidebar.component.ts
 *
 * NO editar a mano. Regenerar con:
 *   cd app-shop && node ../.claude/workspace/scripts/generar-menu-routes.mjs
 */

export interface MenuItem {
    /** Texto visible en el sidebar */
    label: string;
    /** Ruta navegable */
    route: string;
}

export interface MenuGroup {
    title: string;
    /** Código de módulo que habilita el grupo (null = siempre visible) */
    moduleCode: string | null;
    items: MenuItem[];
}

export const MENU_GROUPS: MenuGroup[] = [
    {
        title: "Dashboard",
        moduleCode: null,
        items: [
            { label: "Resumen General", route: "/admin/dashboard" },
        ],
    },
    {
        title: "Ventas",
        moduleCode: "VENTAS",
        items: [
            { label: "Dashboard Ventas", route: "/admin/ventas/dashboard" },
            { label: "Pedidos", route: "/admin/orders" },
            { label: "Productos", route: "/admin/products" },
            { label: "Categorías", route: "/admin/categories" },
            { label: "Devoluciones", route: "/admin/returns" },
            { label: "Promociones", route: "/admin/promotions" },
            { label: "Clientes", route: "/admin/customers" },
        ],
    },
    {
        title: "Compras",
        moduleCode: "COMPRAS",
        items: [
            { label: "Dashboard Compras", route: "/admin/compras/dashboard" },
            { label: "Proveedores", route: "/admin/compras/proveedores" },
            { label: "Catálogo de Compras", route: "/admin/compras/catalogo" },
            { label: "Solicitudes de Compra", route: "/admin/compras/solicitudes" },
            { label: "Mis Solicitudes", route: "/admin/compras/mis-solicitudes" },
            { label: "Bandeja de Aprobaciones", route: "/admin/compras/bandeja-aprobaciones" },
            { label: "Cotizaciones (RFQ)", route: "/admin/compras/cotizaciones" },
            { label: "Órdenes de Compra", route: "/admin/compras/ordenes" },
            { label: "Tablero de Órdenes", route: "/admin/compras/kanban" },
            { label: "Recepción Mercadería", route: "/admin/compras/recepcion" },
            { label: "Facturas de Proveedor", route: "/admin/compras/facturas-proveedor" },
            { label: "Devoluciones a Proveedor", route: "/admin/compras/devoluciones" },
            { label: "Contratos", route: "/admin/compras/contratos" },
            { label: "Compras Centralizadas", route: "/admin/compras/consolidaciones" },
            { label: "Puntos de Reorden", route: "/admin/compras/puntos-reorden" },
            { label: "Presupuestos de Compras", route: "/admin/compras/presupuestos" },
            { label: "Evaluación de Proveedores", route: "/admin/compras/evaluaciones" },
            { label: "Historial de Precios", route: "/admin/compras/historial-precios" },
            { label: "Alertas de Compras", route: "/admin/compras/alertas" },
            { label: "Reportes KPI", route: "/admin/compras/reportes-kpi" },
            { label: "Niveles de Aprobación", route: "/admin/compras/config-aprobaciones" },
        ],
    },
    {
        title: "Logística",
        moduleCode: "LOGISTICA",
        items: [
            { label: "Dashboard Logístico", route: "/admin/logistica/dashboard" },
            { label: "Envíos", route: "/admin/logistica/envios" },
            { label: "Tracking", route: "/admin/logistica/tracking" },
            { label: "Rutas de Entrega", route: "/admin/logistica/rutas" },
            { label: "Guías de Remisión", route: "/admin/logistica/guias" },
            { label: "Transportistas", route: "/admin/logistica/transportistas" },
            { label: "SLA Transportistas", route: "/admin/logistica/transportistas-sla" },
            { label: "Devoluciones", route: "/admin/logistica/devoluciones" },
            { label: "Batch Picking", route: "/admin/logistica/batch-picking" },
            { label: "Picking Móvil", route: "/admin/logistica/picking-mobile" },
            { label: "Reservas de Stock", route: "/admin/logistica/stock-reservations" },
            { label: "KPI Logísticos", route: "/admin/logistica/kpi" },
            { label: "Notificaciones", route: "/admin/logistica/notificaciones" },
            { label: "Mapeo Contable", route: "/admin/logistica/mapeo-contable" },
        ],
    },
    {
        title: "Inventario",
        moduleCode: "INVENTARIO",
        items: [
            { label: "Dashboard", route: "/admin/inventario/dashboard" },
            { label: "Almacenes", route: "/admin/inventario/almacenes" },
            { label: "Ubicaciones", route: "/admin/inventario/ubicaciones" },
            { label: "Stock", route: "/admin/inventario/stock" },
            { label: "Movimientos", route: "/admin/inventario/movimientos" },
            { label: "Recepción (ASN)", route: "/admin/inventario/asn" },
            { label: "Transferencias", route: "/admin/inventario/transferencias" },
            { label: "Inventarios Físicos", route: "/admin/inventario/conteos" },
            { label: "Kardex Valorizado", route: "/admin/inventario/kardex" },
            { label: "Análisis ABC", route: "/admin/inventario/abc" },
            { label: "Zonas", route: "/admin/inventario/zonas" },
            { label: "Lotes", route: "/admin/inventario/lotes" },
            { label: "Números de Serie", route: "/admin/inventario/series" },
            { label: "Reglas de Reposición", route: "/admin/inventario/reglas-reposicion" },
            { label: "Kardex por Almacén", route: "/admin/inventario/kardex-almacen" },
        ],
    },
    {
        title: "Tesorería",
        moduleCode: "TESORERIA",
        items: [
            { label: "Dashboard", route: "/admin/tesoreria/dashboard" },
            { label: "Control de Cajas", route: "/admin/tesoreria/cajas" },
            { label: "Cuentas Bancarias", route: "/admin/tesoreria/cuentas-bancarias" },
            { label: "Pagos / Workflow", route: "/admin/tesoreria/pagos" },
            { label: "Flujo de Caja", route: "/admin/tesoreria/flujo-caja" },
        ],
    },
    {
        title: "Contabilidad",
        moduleCode: "CONTABILIDAD",
        items: [
            { label: "Dashboard Contable", route: "/admin/contabilidad/dashboard" },
            { label: "Asientos Contables", route: "/admin/contabilidad/asientos" },
            { label: "Plan de Cuentas PCGE", route: "/admin/contabilidad/plan-cuentas" },
            { label: "Libro Diario", route: "/admin/contabilidad/diario" },
            { label: "Libro Mayor", route: "/admin/contabilidad/libro-mayor" },
            { label: "Balance General", route: "/admin/contabilidad/balance" },
            { label: "Estado de Resultados", route: "/admin/contabilidad/estado-resultados" },
            { label: "Registro Ventas", route: "/admin/contabilidad/ventas" },
            { label: "Registro Compras", route: "/admin/contabilidad/compras" },
            { label: "Declaración IGV", route: "/admin/contabilidad/igv" },
            { label: "Asientos Recurrentes", route: "/admin/contabilidad/asientos-recurrentes" },
            { label: "Reglas de Asiento", route: "/admin/contabilidad/reglas-asiento" },
            { label: "Conciliación Bancaria", route: "/admin/contabilidad/conciliacion" },
            { label: "Presupuesto Anual", route: "/admin/contabilidad/presupuesto" },
            { label: "Flujo de Efectivo", route: "/admin/contabilidad/flujo-efectivo" },
            { label: "Antigüedad de Saldos", route: "/admin/contabilidad/aging" },
            { label: "Tipo de Cambio", route: "/admin/contabilidad/tipo-cambio" },
            { label: "Cierre Contable", route: "/admin/contabilidad/cierre" },
            { label: "Estados Consolidados", route: "/admin/contabilidad/consolidado" },
            { label: "Auditoría Contable", route: "/admin/contabilidad/auditoria" },
        ],
    },
    {
        title: "RRHH",
        moduleCode: "RRHH",
        items: [
            { label: "Dashboard", route: "/admin/rrhh/dashboard" },
            { label: "Empleados", route: "/admin/rrhh/employees" },
            { label: "Departamentos", route: "/admin/rrhh/departments" },
            { label: "Puestos", route: "/admin/rrhh/positions" },
            { label: "Contratos", route: "/admin/rrhh/contracts" },
            { label: "Asistencia", route: "/admin/rrhh/attendance" },
            { label: "Vacaciones", route: "/admin/rrhh/vacations" },
            { label: "Nómina", route: "/admin/rrhh/payroll" },
            { label: "Evaluaciones", route: "/admin/rrhh/evaluations" },
            { label: "Criterios de Evaluación", route: "/admin/rrhh/evaluations/criteria" },
            { label: "Metas y Objetivos", route: "/admin/rrhh/goals" },
            { label: "Capacitaciones", route: "/admin/rrhh/trainings" },
            { label: "Analytics", route: "/admin/rrhh/analytics" },
            { label: "Portal Empleado", route: "/admin/rrhh/portal" },
        ],
    },
    {
        title: "Punto de Venta",
        moduleCode: "POS",
        items: [
            { label: "Abrir POS", route: "/pos" },
            { label: "Devoluciones", route: "/pos/devoluciones" },
            { label: "Transacciones POS", route: "/admin/transactions" },
        ],
    },
    {
        title: "Clientes",
        moduleCode: null,
        items: [
            { label: "Lista de Clientes", route: "/admin/customers" },
            { label: "Dashboard Clientes", route: "/admin/customers/dashboard" },
            { label: "Segmentos", route: "/admin/segments" },
        ],
    },
    {
        title: "Soporte",
        moduleCode: null,
        items: [
            { label: "Bandeja de Soporte", route: "/admin/soporte/chat" },
        ],
    },
    {
        title: "Empresas",
        moduleCode: null,
        items: [
            { label: "Empresas", route: "/admin/companies" },
            { label: "Usuarios", route: "/admin/users" },
            { label: "Sucursales", route: "/admin/sucursales" },
        ],
    },
    {
        title: "Plataforma SaaS",
        moduleCode: null,
        items: [
            { label: "Planes SaaS", route: "/admin/saas-plans" },
            { label: "Parámetros Sistema", route: "/admin/general-config" },
        ],
    },
    {
        title: "Configuración Visual",
        moduleCode: null,
        items: [
            { label: "Temas por Módulo", route: "/admin/store-theme" },
            { label: "Apariencia", route: "/admin/apariencia" },
            { label: "Footer", route: "/admin/footer-manager" },
            { label: "Slider / Banners", route: "/admin/slider-manager" },
            { label: "Contenido Landing", route: "/admin/landing-content" },
        ],
    },
    {
        title: "Reportes",
        moduleCode: null,
        items: [
            { label: "Dashboard Ejecutivo", route: "/admin/reports/ejecutivo" },
            { label: "Reporte de Inventario", route: "/admin/reports/inventory" },
            { label: "Reporte de Clientes", route: "/admin/reports/customers" },
            { label: "Reporte de Ventas", route: "/admin/reports/ventas" },
            { label: "Reporte RRHH", route: "/admin/reports/rrhh" },
        ],
    },
];

/** Todas las opciones del menú, aplanadas (conserva label + route). */
export const ALL_MENU_ROUTES: MenuItem[] = MENU_GROUPS.flatMap(g => g.items);
