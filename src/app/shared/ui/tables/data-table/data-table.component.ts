import { Component, input, output, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { ExportService } from '@shared/services/export.service';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';

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
    imports: [CommonModule, AsyncPipe, PaginationComponent],
    templateUrl: './data-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent<T = any> {
    data = input.required<T[]>();
    columns = input.required<TableColumn<T>[]>();
    actions = input<TableAction<T>[]>([]);

    loading = input<boolean>(false);
    selectable = input<boolean>(false);

    currentPage = input<number>(0);
    pageSize = input<number>(10);
    totalElements = input<number>(0);
    totalPages = input<number>(0);

    sortField = input<string>('');
    sortDirection = input<'asc' | 'desc'>('asc');

    searchable = input<boolean>(false);
    searchPlaceholder = input<string>('Buscar...');
    filters = input<FilterConfig[]>([]);
    exportable = input<boolean>(false);
    exportFileName = input<string>('export');
    hidePagination = input<boolean>(false);

    pageChange = output<PaginationEvent>();
    sortChange = output<SortEvent>();
    rowSelect = output<T>();
    searchChange = output<string>();
    filterChange = output<FilterChangeEvent>();

    private readonly exportService = inject(ExportService);
    
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
        
        let newDirection: 'asc' | 'desc' = 'asc';
        
        if (currentField === column.key) {
            newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
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

    onSearchInput(event: Event): void {
        this.searchChange.emit((event.target as HTMLInputElement).value);
    }

    onFilterChange(field: string, event: Event): void {
        const val = (event.target as HTMLSelectElement).value;
        this.filterChange.emit({ field, value: val === '' ? null : val });
    }

    onExportCsv(): void {
        const headers = this.columns().map(c => c.label);
        const rows = this.data().map(row => this.columns().map(col => this.getCellValue(row, col)));
        this.exportService.exportCsv([headers, ...rows], this.exportFileName());
    }

    onExportExcel(): void {
        const headers = this.columns().map(c => c.label);
        const rows = this.data().map(row => this.columns().map(col => this.getCellValue(row, col)));
        this.exportService.exportExcel(headers, rows, this.exportFileName());
    }
}
