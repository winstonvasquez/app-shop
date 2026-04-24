// Catálogo de iconos usados en el ERP
// Todos de lucide-angular — importar solo los necesarios por componente

export const ICON_CATALOG = {
    // Navegación
    home: 'home',
    menu: 'menu',
    arrowLeft: 'arrow-left',
    arrowRight: 'arrow-right',
    chevronDown: 'chevron-down',
    chevronUp: 'chevron-up',
    chevronLeft: 'chevron-left',
    chevronRight: 'chevron-right',

    // Acciones
    add: 'plus',
    edit: 'pencil',
    delete: 'trash-2',
    save: 'save',
    search: 'search',
    filter: 'filter',
    download: 'download',
    upload: 'upload',
    print: 'printer',
    copy: 'copy',

    // UI
    close: 'x',
    check: 'check',
    info: 'info',
    warning: 'alert-triangle',
    error: 'alert-circle',
    success: 'check-circle',

    // ERP específico
    invoice: 'file-text',
    order: 'shopping-cart',
    product: 'package',
    user: 'user',
    company: 'building-2',
    settings: 'settings',
    report: 'bar-chart-2',
    calendar: 'calendar',
    money: 'dollar-sign',
    truck: 'truck',
    warehouse: 'warehouse',
} as const;

export type IconName = typeof ICON_CATALOG[keyof typeof ICON_CATALOG];
