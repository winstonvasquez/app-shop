import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn<T = any> {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (row: T) => string;
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

@Component({
    selector: 'app-data-table',
    standalone: true,
    imports: [CommonModule],
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
    
    pageChange = output<PaginationEvent>();
    sortChange = output<SortEvent>();
    rowSelect = output<T>();
    
    selectedRows = new Set<T>();
    
    pages = computed(() => {
        const total = this.totalPages();
        return Array.from({ length: total }, (_, i) => i);
    });
    
    isEmpty = computed(() => !this.loading() && this.data().length === 0);
    
    hasActions = computed(() => this.actions().length > 0);
    
    protected readonly Math = Math;
    
    onPageChange(page: number): void {
        if (page >= 0 && page < this.totalPages()) {
            this.pageChange.emit({ page, size: this.pageSize() });
        }
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
}
