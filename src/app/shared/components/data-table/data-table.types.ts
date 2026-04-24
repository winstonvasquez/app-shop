export interface TableColumn<T = unknown> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;          // 'auto' | '120px' | etc.
  sticky?: 'left' | 'right';
  cellClass?: string;
  headerClass?: string;
  valueGetter?: (row: T) => unknown;  // para valores calculados
}

export interface PageEvent {
  page: number;       // 0-indexed
  pageSize: number;
}

export interface SortEvent {
  column: string;
  direction: 'asc' | 'desc';
}

export interface TableState {
  page: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}
