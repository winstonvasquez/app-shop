import { Component, input, output, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { ExportService } from '@shared/services/export.service';
import { BackendExportService, BackendExportConfig } from '@shared/services/backend-export.service';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { ButtonComponent } from '@shared/components';
import { PAGINATION } from '@shared/constants/app.constants';
import { SORT_DIRECTIONS } from '@shared/constants/ui.constants';

export interface TableColumn<T = any> {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (row: T) => string;
    /** Set to true when render() returns an HTML string (e.g. badge spans) */
    html?: boolean;
}

export interface TableAction<T = any> {
    label: string;
    icon?: string;
    onClick: (row: T) => void;
    show?: (row: T) => boolean;
    class?: string;
}

export interface PaginationEvent {
    page: number;
    size: number;
}

export interface SortEvent {
    field: string;
    direction: 'asc' | 'desc';
}

export interface FilterConfig {
    field: string;
    label: string;
    options: Observable<{ value: string | number; label: string }[]>;
}

export interface FilterChangeEvent {
    field: string;
    value: string | number | null;
}

@Component({
    selector: 'app-data-table',
    standalone: true,
    imports: [AsyncPipe, PaginationComponent, ButtonComponent],
    templateUrl: './data-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent<T = any> {
    data = input.required<T[]>();
    columns = input.required<TableColumn<T>[]>();
    actions = input<TableAction<T>[]>([]);

    loading = input<boolean>(false);

    /** Filas placeholder para el shimmer skeleton mientras carga. */
    protected readonly skeletonRows = Array.from({ length: 6 }, (_, i) => i);
    selectable = input<boolean>(false);

    currentPage = input<number>(0);
    pageSize = input<number>(PAGINATION.defaultPageSize);
    totalElements = input<number>(0);
    totalPages = input<number>(0);

    sortField = input<string>('');
    sortDirection = input<'asc' | 'desc'>(SORT_DIRECTIONS.asc);

    searchable = input<boolean>(false);
    searchPlaceholder = input<string>('Buscar...');
    filters = input<FilterConfig[]>([]);
    exportable = input<boolean>(true);  // todas las tablas ofrecen export por defecto (CSV/XLSX)
    exportFileName = input<string>('export');
    /**
     * Si se provee, la exportación se hace SERVER-SIDE (el backend genera el
     * archivo con datos limpios). Si es null, cae al export client-side legacy.
     */
    exportConfig = input<BackendExportConfig | null>(null);
    hidePagination = input<boolean>(false);

    pageChange = output<PaginationEvent>();
    sortChange = output<SortEvent>();
    rowSelect = output<T>();
    /** Emite el conjunto de filas seleccionadas cada vez que cambia (modo selectable). */
    selectionChange = output<T[]>();
    searchChange = output<string>();
    filterChange = output<FilterChangeEvent>();

    private readonly exportService = inject(ExportService);
    private readonly backendExport = inject(BackendExportService);

    /** Término de búsqueda tecleado; el filtrado se dispara con el botón "Buscar" o Enter. */
    protected readonly searchTerm = signal('');

    selectedRows = new Set<T>();
    
    pages = computed(() => {
        const total = this.totalPages();
        return Array.from({ length: total }, (_, i) => i);
    });
    
    isEmpty = computed(() => !this.loading() && (this.data() ?? []).length === 0);
    
    hasActions = computed(() => this.actions().length > 0);
    
    protected readonly Math = Math;
    
    onPageChange(page: number): void {
        if (page >= 0 && page < this.totalPages()) {
            this.pageChange.emit({ page, size: this.pageSize() });
        }
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.pageChange.emit(event);
    }
    
    onSort(column: TableColumn<T>): void {
        if (!column.sortable) return;
        
        const currentField = this.sortField();
        const currentDirection = this.sortDirection();
        
        let newDirection: 'asc' | 'desc' = SORT_DIRECTIONS.asc;

        if (currentField === column.key) {
            newDirection = currentDirection === SORT_DIRECTIONS.asc ? SORT_DIRECTIONS.desc : SORT_DIRECTIONS.asc;
        }
        
        this.sortChange.emit({
            field: column.key,
            direction: newDirection
        });
    }
    
    onRowClick(row: T): void {
        if (this.selectable()) {
            this.rowSelect.emit(row);
        }
    }
    
    toggleRowSelection(row: T): void {
        if (this.selectedRows.has(row)) {
            this.selectedRows.delete(row);
        } else {
            this.selectedRows.add(row);
        }
        this.selectionChange.emit([...this.selectedRows]);
    }

    /** Selecciona/deselecciona todas las filas visibles (checkbox del header). */
    toggleSelectAll(): void {
        if (this.selectedRows.size === this.data().length) {
            this.selectedRows.clear();
        } else {
            this.data().forEach(r => this.selectedRows.add(r));
        }
        this.selectionChange.emit([...this.selectedRows]);
    }
    
    isRowSelected(row: T): boolean {
        return this.selectedRows.has(row);
    }
    
    getCellValue(row: T, column: TableColumn<T>): string {
        if (column.render) {
            return column.render(row);
        }
        return (row as any)[column.key]?.toString() || '';
    }
    
    shouldShowAction(action: TableAction<T>, row: T): boolean {
        return action.show ? action.show(row) : true;
    }
    
    getSortIcon(column: TableColumn<T>): string {
        if (!column.sortable) return '';

        const isActive = this.sortField() === column.key;
        if (!isActive) return '↕';

        return this.sortDirection() === 'asc' ? '↑' : '↓';
    }

    /** Maps action icon string to a canonical type for SVG rendering */
    getIconType(icon: string): 'edit' | 'delete' | 'view' | 'check' | 'x' | 'pin' | 'text' {
        const norm = icon.trim();
        if (['✏️', '✏', 'edit'].includes(norm))             return 'edit';
        if (['🗑️', '🗑', 'trash', 'delete'].includes(norm)) return 'delete';
        if (['👁️', '👁', 'view'].includes(norm))            return 'view';
        if (['✓', '✔️', '✔', 'check', 'approve'].includes(norm)) return 'check';
        if (['✗', '✕', 'x', 'close', '🚫', 'ban', 'reject'].includes(norm)) return 'x';
        if (['📍', 'pin', 'location'].includes(norm))        return 'pin';
        return 'text';
    }

    /** Returns the CSS class(es) for an action button */
    getButtonClass(action: TableAction<T>): string {
        const cls = action.class || '';
        // Explicit class overrides take priority
        if (cls.includes('btn-icon-edit'))   return 'btn-icon btn-icon-edit';
        if (cls.includes('btn-icon-delete')) return 'btn-icon btn-icon-delete';
        if (cls.includes('btn-view'))        return 'btn-icon btn-view';
        if (cls.includes('btn-delete'))      return 'btn-icon btn-icon-delete';
        if (cls.includes('btn-edit'))        return 'btn-icon btn-icon-edit';
        // Fall back to icon type detection
        const type = this.getIconType(action.icon || '');
        if (type === 'edit')   return 'btn-icon btn-icon-edit';
        if (type === 'delete') return 'btn-icon btn-icon-delete';
        if (type === 'view')   return 'btn-icon btn-view';
        if (type === 'check')  return 'btn-icon btn-icon-edit';
        if (type === 'x')      return 'btn-icon btn-icon-delete';
        if (type === 'pin')    return 'btn-icon btn-view';
        return `btn-icon ${cls}`.trim();
    }

    onSearchInput(event: Event): void {
        this.searchTerm.set((event.target as HTMLInputElement).value);
    }

    /** Ejecuta el filtrado: se llama desde el botón "Buscar" y con Enter. */
    onSearchSubmit(): void {
        this.searchChange.emit(this.searchTerm());
    }

    /** Limpia el término y resetea la búsqueda (server-side vuelve a la lista completa). */
    onSearchClear(): void {
        this.searchTerm.set('');
        this.searchChange.emit('');
    }

    onFilterChange(field: string, event: Event): void {
        const val = (event.target as HTMLSelectElement).value;
        this.filterChange.emit({ field, value: val === '' ? null : val });
    }

    onExportCsv(): void {
        const cfg = this.exportConfig();
        if (cfg) { this.backendExport.download(cfg, 'csv'); return; }
        // Fallback client-side (legacy) mientras el módulo no tenga export backend.
        const headers = this.columns().map(c => c.label);
        const rows = this.data().map(row => this.columns().map(col => this.getExportValue(row, col)));
        this.exportService.exportCsv([headers, ...rows], this.exportFileName());
    }

    onExportExcel(): void {
        const cfg = this.exportConfig();
        if (cfg) { this.backendExport.download(cfg, 'xlsx'); return; }
        // Fallback client-side (legacy) mientras el módulo no tenga export backend.
        const headers = this.columns().map(c => c.label);
        const rows = this.data().map(row => this.columns().map(col => this.getExportValue(row, col)));
        this.exportService.exportExcel(headers, rows, this.exportFileName());
    }

    /**
     * Valor LIMPIO para exportación client-side (fallback): usa el dato crudo, NO
     * el HTML de render() (evita que salgan `<span class="badge">…` en el CSV/XLSX).
     */
    private getExportValue(row: T, column: TableColumn<T>): string {
        if (column.render && !column.html) {
            return column.render(row);
        }
        const raw = (row as Record<string, unknown>)[column.key];
        return raw === null || raw === undefined ? '' : String(raw);
    }
}
