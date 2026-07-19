import {
    Component, input, output, computed,
    ChangeDetectionStrategy
} from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface PaginationChangeEvent {
    page: number;
    size: number;
}

type PageItem = number | 'ellipsis';

@Component({
    selector: 'app-pagination',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule],
    template: `
@if (totalPages() > 0) {
<div class="pg-bar">

    <!-- Mostrando X-Y de Z -->
    <span class="pg-info">
        Mostrando {{ rangeStart() }}-{{ rangeEnd() }} de {{ totalElements() }}
    </span>

    <!-- Botones de navegación -->
    <div class="pg-nav">

        <button class="pg-btn pg-btn-text" [disabled]="currentPage() === 0"
                (click)="go(currentPage() - 1)">
            ← Anterior
        </button>

        @for (item of pageItems(); track $index) {
            @if (item === 'ellipsis') {
                <span class="pg-dots">...</span>
            } @else {
                <button class="pg-btn" [class.pg-btn-active]="item === currentPage()"
                        (click)="go(item)">
                    {{ item + 1 }}
                </button>
            }
        }

        <button class="pg-btn pg-btn-text" [disabled]="currentPage() >= totalPages() - 1"
                (click)="go(currentPage() + 1)">
            Siguiente →
        </button>

    </div>

    <!-- Ir a página -->
    <div class="pg-goto">
        <span class="pg-label">Ir a página:</span>
        <input class="pg-input" type="number" min="1" [max]="totalPages()"
               [(ngModel)]="gotoValue" (keydown.enter)="goToPage()" />
        <button class="pg-btn pg-btn-go" (click)="goToPage()">Ir</button>
    </div>

    <!-- Filas por página -->
    <div class="pg-size">
        <span class="pg-label">Filas por página:</span>
        <select class="pg-select" [ngModel]="pageSize()" (ngModelChange)="onSizeChange($event)">
            @for (opt of pageSizeOptions; track opt) {
                <option [value]="opt">{{ opt }}</option>
            }
        </select>
    </div>

</div>
}
    `,
    styles: [`
:host { display: block; }

/* ── Contenedor principal ─────────────────────────────── */
.pg-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 12px;
    padding: 8px 16px;
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
    font-size: 12.5px;
    color: var(--color-text-primary);
}

/* ── Texto "Mostrando…" ───────────────────────────────── */
.pg-info {
    color: var(--color-text-muted);
    white-space: nowrap;
    margin-right: auto;
}

/* ── Grupo de navegación ──────────────────────────────── */
.pg-nav {
    display: flex;
    align-items: center;
    gap: 3px;
}

/* ── Botón base ───────────────────────────────────────── */
.pg-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;
    height: 30px;
    padding: 0 8px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: 12.5px;
    line-height: 1;
    cursor: pointer;
    transition: border-color .12s, background .12s, color .12s;
    white-space: nowrap;
    user-select: none;
}

.pg-btn:hover:not([disabled]):not(.pg-btn-active) {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: color-mix(in oklch, var(--color-primary) 8%, var(--color-surface));
}

.pg-btn[disabled] {
    opacity: 0.38;
    cursor: not-allowed;
    pointer-events: none;
}

/* Página activa */
.pg-btn-active {
    background: var(--color-primary) !important;
    border-color: var(--color-primary) !important;
    color: #fff !important;
    font-weight: 600;
    cursor: default;
}

/* Anterior / Siguiente — texto con flecha */
.pg-btn-text {
    padding: 0 12px;
    gap: 4px;
}

/* Botón "Ir" — acento corporativo */
.pg-btn-go {
    padding: 0 14px;
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
}
.pg-btn-go:hover:not([disabled]) {
    background: color-mix(in srgb, var(--color-primary) 88%, #000);
    border-color: color-mix(in srgb, var(--color-primary) 88%, #000);
    color: #fff;
}

/* ── Puntos suspensivos ───────────────────────────────── */
.pg-dots {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 30px;
    font-size: 13px;
    color: var(--color-text-muted);
    letter-spacing: 1px;
    user-select: none;
}

/* ── Grupos auxiliares ────────────────────────────────── */
.pg-goto,
.pg-size {
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
}

.pg-label {
    color: var(--color-text-muted);
    font-size: 13px;
}

/* ── Input "Ir a página" ──────────────────────────────── */
.pg-input {
    width: 48px;
    height: 30px;
    padding: 0 6px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-size: 12.5px;
    text-align: center;
    -moz-appearance: textfield;
}
.pg-input::-webkit-inner-spin-button,
.pg-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.pg-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px color-mix(in oklch, var(--color-primary) 20%, transparent);
}

/* ── Select "Filas por página" ────────────────────────── */
.pg-select {
    height: 30px;
    padding: 0 1.75rem 0 8px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background-color: var(--color-surface);
    color: var(--color-text-primary);
    font-size: 12.5px;
    cursor: pointer;
    min-width: 60px;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    background-size: 0.75rem;
}
.pg-select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px color-mix(in oklch, var(--color-primary) 20%, transparent);
}

/* ── Responsive ───────────────────────────────────────── */
@media (max-width: 640px) {
    .pg-info { margin-right: 0; flex-basis: 100%; }
    .pg-nav  { flex-wrap: wrap; }
}
    `]
})
export class PaginationComponent {
    currentPage   = input.required<number>();
    totalPages    = input.required<number>();
    totalElements = input.required<number>();
    pageSize      = input<number>(10);

    pageChange = output<PaginationChangeEvent>();

    readonly pageSizeOptions = [10, 20, 50, 100];

    gotoValue: number | null = null;

    rangeStart = computed(() =>
        this.totalElements() === 0 ? 0 : this.currentPage() * this.pageSize() + 1
    );

    rangeEnd = computed(() =>
        Math.min((this.currentPage() + 1) * this.pageSize(), this.totalElements())
    );

    pageItems = computed<PageItem[]>(() => {
        const total = this.totalPages();
        const cur   = this.currentPage();

        if (total <= 0) return [];
        if (total <= 7) return Array.from({ length: total }, (_, i) => i);

        const items: PageItem[] = [];

        // Siempre la primera
        items.push(0);

        const winStart = Math.max(1, cur - 2);
        const winEnd   = Math.min(total - 2, cur + 2);

        if (winStart > 1)        items.push('ellipsis');
        for (let i = winStart; i <= winEnd; i++) items.push(i);
        if (winEnd < total - 2)  items.push('ellipsis');

        // Siempre la última
        items.push(total - 1);

        return items;
    });

    go(page: number): void {
        if (page < 0 || page >= this.totalPages() || page === this.currentPage()) return;
        this.pageChange.emit({ page, size: this.pageSize() });
    }

    goToPage(): void {
        if (this.gotoValue === null) return;
        const page = Math.min(Math.max(Math.floor(this.gotoValue) - 1, 0), this.totalPages() - 1);
        this.gotoValue = null;
        this.go(page);
    }

    onSizeChange(newSize: number): void {
        this.pageChange.emit({ page: 0, size: Number(newSize) });
    }
}
