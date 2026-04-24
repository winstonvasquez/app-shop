import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-paginator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="pagination">
      <span class="pagination-info">
        {{ rangeLabel() }} de {{ totalElements() }}
      </span>

      <div class="pagination-controls">
        <!-- Selector de filas por página -->
        <select class="input-field py-1 text-sm w-auto"
                [value]="pageSize()"
                (change)="onPageSizeChange($event)">
          @for (size of pageSizeOptions(); track size) {
            <option [value]="size">{{ size }} por página</option>
          }
        </select>

        <!-- Navegación -->
        <button class="btn-page" [disabled]="page() === 0" (click)="first()" title="Primera página">«</button>
        <button class="btn-page" [disabled]="page() === 0" (click)="prev()" title="Anterior">‹</button>

        @for (p of visiblePages(); track p) {
          @if (p === -1) {
            <span class="px-2 text-muted">…</span>
          } @else {
            <button class="btn-page" [class.active]="p === page()" (click)="goTo(p)">{{ p + 1 }}</button>
          }
        }

        <button class="btn-page" [disabled]="page() === totalPages() - 1" (click)="next()" title="Siguiente">›</button>
        <button class="btn-page" [disabled]="page() === totalPages() - 1" (click)="last()" title="Última página">»</button>
      </div>
    </div>
  `,
})
export class PaginatorComponent {
  page = input.required<number>();
  pageSize = input.required<number>();
  totalElements = input.required<number>();
  pageSizeOptions = input([10, 20, 50, 100]);

  pageChange = output<number>();
  pageSizeChange = output<number>();

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalElements() / this.pageSize())));

  rangeLabel = computed(() => {
    const start = this.page() * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, this.totalElements());
    return `${start}–${end}`;
  });

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const pages: number[] = [];
    pages.push(0);
    if (current > 3) pages.push(-1);
    for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) pages.push(i);
    if (current < total - 4) pages.push(-1);
    pages.push(total - 1);
    return pages;
  });

  first() { this.pageChange.emit(0); }
  prev()  { this.pageChange.emit(this.page() - 1); }
  next()  { this.pageChange.emit(this.page() + 1); }
  last()  { this.pageChange.emit(this.totalPages() - 1); }
  goTo(p: number) { this.pageChange.emit(p); }

  onPageSizeChange(e: Event) {
    this.pageSizeChange.emit(parseInt((e.target as HTMLSelectElement).value));
  }
}
