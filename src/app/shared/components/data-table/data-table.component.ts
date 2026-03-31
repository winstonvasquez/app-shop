import {
  Component,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
  ContentChild,
  TemplateRef,
} from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { PaginatorComponent } from './paginator.component';
import { TableColumn, SortEvent } from './data-table.types';

@Component({
  selector: 'app-data-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgTemplateOutlet, LucideAngularModule, PaginatorComponent],
  template: `
    <div class="card overflow-hidden">
      <!-- Loading skeleton -->
      @if (loading()) {
        <div class="animate-pulse p-6 space-y-3">
          @for (row of skeletonRows(); track row) {
            <div class="h-10 rounded" style="background-color: var(--color-surface-raised)"></div>
          }
        </div>
      } @else {
        <!-- Tabla -->
        <div class="overflow-x-auto">
          <table class="table">
            <thead class="table-header">
              <tr>
                @for (col of columns(); track col.key) {
                  <th class="table-header-cell" [class]="col.headerClass ?? ''" [style.width]="col.width">
                    @if (col.sortable) {
                      <button
                        class="flex items-center gap-1 hover:text-primary transition-colors focus-ring"
                        (click)="onSort(col.key)">
                        {{ col.header }}
                        <lucide-icon
                          [name]="sortIcon(col.key)"
                          [size]="12"
                          class="opacity-50" />
                      </button>
                    } @else {
                      {{ col.header }}
                    }
                  </th>
                }
                @if (hasActions()) {
                  <th class="table-header-cell w-24 text-right">Acciones</th>
                }
              </tr>
            </thead>
            <tbody>
              @if (rows().length === 0) {
                <tr>
                  <td
                    [attr.colspan]="columns().length + (hasActions() ? 1 : 0)"
                    class="table-cell text-center py-16">
                    <div class="flex flex-col items-center gap-3">
                      <lucide-icon name="inbox" [size]="40" class="opacity-20" />
                      <span class="text-muted">{{ emptyMessage() }}</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (row of rows(); track trackByFn()(row)) {
                  <tr class="table-row group">
                    @for (col of columns(); track col.key) {
                      <td class="table-cell" [class]="col.cellClass ?? ''">
                        @if (col.valueGetter) {
                          {{ col.valueGetter(row) }}
                        } @else {
                          {{ getCellValue(row, col.key) }}
                        }
                      </td>
                    }
                    @if (hasActions()) {
                      <td class="table-cell text-right">
                        @if (actionsTemplate) {
                          <ng-container *ngTemplateOutlet="actionsTemplate; context: { $implicit: row }" />
                        }
                      </td>
                    }
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Paginador -->
        @if (totalElements() > 0) {
          <app-paginator
            [page]="page()"
            [pageSize]="pageSize()"
            [totalElements]="totalElements()"
            [pageSizeOptions]="pageSizeOptions()"
            (pageChange)="onPageChange($event)"
            (pageSizeChange)="onPageSizeChange($event)" />
        }
      }
    </div>
  `,
})
export class DataTableComponent<T extends Record<string, unknown> = Record<string, unknown>> {
  columns = input.required<TableColumn<T>[]>();
  rows = input<T[]>([]);
  loading = input(false);
  page = input(0);
  pageSize = input(20);
  totalElements = input(0);
  pageSizeOptions = input([10, 20, 50, 100]);
  emptyMessage = input('No hay registros para mostrar');
  hasActions = input(false);
  trackByFn = input<(row: T) => unknown>((row: T) => row['id'] ?? JSON.stringify(row));

  pageChange = output<number>();
  pageSizeChange = output<number>();
  sortChange = output<SortEvent>();

  @ContentChild('actions') actionsTemplate?: TemplateRef<{ $implicit: T }>;

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  skeletonRows = computed(() => Array(this.pageSize() > 5 ? 5 : this.pageSize()).fill(0));

  sortIcon(colKey: string): string {
    if (this.sortColumn !== colKey) return 'chevrons-up-down';
    return this.sortDirection === 'asc' ? 'chevron-up' : 'chevron-down';
  }

  onSort(colKey: string) {
    if (this.sortColumn === colKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = colKey;
      this.sortDirection = 'asc';
    }
    this.sortChange.emit({ column: colKey, direction: this.sortDirection });
  }

  onPageChange(page: number) { this.pageChange.emit(page); }
  onPageSizeChange(size: number) { this.pageSizeChange.emit(size); }

  getCellValue(row: T, key: string): unknown {
    return key.split('.').reduce(
      (obj: unknown, k) => (obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[k] : undefined),
      row,
    );
  }
}
