import {
    ChangeDetectionStrategy, Component, ElementRef, HostListener,
    effect, forwardRef, inject, input, signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Valor del `id` de una opción: `number` (la mayoría de entidades) o `string` (ej. UUID de Proveedor). */
export type ServerSelectId = number | string;

/** Opción mostrada en el dropdown. `id` es el valor que sale por el ControlValueAccessor. */
export interface ServerSelectOption {
    id: ServerSelectId;
    label: string;
    /** Texto secundario (ej. código de empleado) mostrado entre paréntesis. */
    sublabel?: string;
}

/**
 * Fuente de datos server-side del search-select. Cada feature provee un adapter
 * (ver `employeeSelectSource` / `departmentSelectSource` / `proveedorSelectSource`).
 */
export interface ServerSelectDataSource {
    /** Trae una página. `search` vacío ⇒ primeros N (orden "últimos registrados"). */
    fetchPage(search: string, page: number, size: number): Promise<{ items: ServerSelectOption[]; last: boolean }>;
    /** Resuelve el label de un id ya seleccionado (para preseleccionar en modo edición). */
    resolveOption(id: ServerSelectId): Promise<ServerSelectOption | null>;
}

/**
 * Select con búsqueda server-side reutilizable para entidades grandes (empleados,
 * departamentos, …). Implementa ControlValueAccessor ⇒ funciona con `formControlName`,
 * `[(ngModel)]` o `[formControl]`. El valor emitido es el `id` (number) o `null`.
 *
 * Comportamiento:
 *  - Al enfocar muestra la primera página (los últimos N registrados).
 *  - Al escribir, con debounce (500ms por defecto), reconsulta desde la página 0.
 *  - Al hacer scroll al fondo del dropdown trae la siguiente página (infinite scroll, N en N).
 *
 * Uso:
 *   <app-server-search-select [dataSource]="employeeSource"
 *                             formControlName="employeeId"
 *                             placeholder="Buscar empleado…" />
 */
@Component({
    selector: 'app-server-search-select',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './server-search-select.component.html',
    styleUrl: './server-search-select.component.scss',
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => ServerSearchSelectComponent),
        multi: true,
    }],
    host: { class: 'server-search-select' },
})
export class ServerSearchSelectComponent implements ControlValueAccessor {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /** Adapter que sabe traer páginas y resolver un id. */
    readonly dataSource = input<ServerSelectDataSource | null>(null);
    readonly placeholder = input<string>('Buscar…');
    readonly pageSize = input<number>(20);
    readonly debounceMs = input<number>(500);
    /** Texto del botón para limpiar la selección. */
    readonly allowClear = input<boolean>(true);

    readonly value = signal<ServerSelectId | null>(null);
    readonly disabled = signal(false);
    readonly open = signal(false);
    readonly loading = signal(false);
    readonly options = signal<ServerSelectOption[]>([]);
    readonly inputText = signal<string>('');
    readonly activeIndex = signal<number>(-1);
    readonly last = signal<boolean>(true);

    private page = 0;
    private query = '';
    private selectedLabel = '';
    /** Secuencia para descartar respuestas fuera de orden (typeahead). */
    private reqSeq = 0;
    private debounceTimer?: ReturnType<typeof setTimeout>;
    private onChange: (v: ServerSelectId | null) => void = () => { /* set por Angular */ };
    onTouched: () => void = () => { /* set por Angular */ };

    constructor() {
        // Resuelve el label de un valor preseleccionado en cuanto haya dataSource.
        // (writeValue puede llegar antes de que el input dataSource esté disponible.)
        effect(() => {
            const ds = this.dataSource();
            const v = this.value();
            if (ds && v != null && !this.selectedLabel) {
                ds.resolveOption(v).then(opt => {
                    if (opt && this.value() === v) {
                        this.selectedLabel = this.formatLabel(opt);
                        this.inputText.set(this.selectedLabel);
                    }
                }).catch(() => { /* id inválido: se deja vacío */ });
            }
        });
    }

    // ── Interacción ───────────────────────────────────────────────────────────

    onFocus(): void {
        if (this.disabled()) return;
        this.open.set(true);
        if (this.options().length === 0 && !this.loading()) {
            void this.reload();
        }
    }

    onInput(text: string): void {
        this.inputText.set(text);
        this.open.set(true);
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.query = text.trim();
            void this.reload();
        }, this.debounceMs());
    }

    onScroll(el: HTMLElement): void {
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
            void this.loadMore();
        }
    }

    select(opt: ServerSelectOption): void {
        this.value.set(opt.id);
        this.selectedLabel = this.formatLabel(opt);
        this.inputText.set(this.selectedLabel);
        this.onChange(opt.id);
        this.onTouched();
        this.close();
    }

    clearSelection(ev?: Event): void {
        ev?.stopPropagation();
        if (this.disabled()) return;
        this.value.set(null);
        this.selectedLabel = '';
        this.inputText.set('');
        this.query = '';
        this.options.set([]);
        this.onChange(null);
        this.onTouched();
    }

    formatLabel(opt: ServerSelectOption): string {
        return opt.sublabel ? `${opt.label} (${opt.sublabel})` : opt.label;
    }

    onKeydown(ev: KeyboardEvent): void {
        if (this.disabled()) return;
        const opts = this.options();
        switch (ev.key) {
            case 'ArrowDown':
                ev.preventDefault();
                if (!this.open()) { this.onFocus(); return; }
                this.activeIndex.set(Math.min(this.activeIndex() + 1, opts.length - 1));
                break;
            case 'ArrowUp':
                ev.preventDefault();
                this.activeIndex.set(Math.max(this.activeIndex() - 1, 0));
                break;
            case 'Enter': {
                const active = opts[this.activeIndex()];
                if (this.open() && active) {
                    ev.preventDefault();
                    this.select(active);
                }
                break;
            }
            case 'Escape':
                this.close();
                break;
        }
    }

    // ── Carga de datos ──────────────────────────────────────────────────────────

    private async reload(): Promise<void> {
        const ds = this.dataSource();
        if (!ds) return;
        this.page = 0;
        this.activeIndex.set(-1);
        const seq = ++this.reqSeq;
        this.loading.set(true);
        try {
            const res = await ds.fetchPage(this.query, 0, this.pageSize());
            if (seq !== this.reqSeq) return;
            this.options.set(res.items);
            this.last.set(res.last);
        } catch {
            if (seq === this.reqSeq) { this.options.set([]); this.last.set(true); }
        } finally {
            if (seq === this.reqSeq) this.loading.set(false);
        }
    }

    private async loadMore(): Promise<void> {
        const ds = this.dataSource();
        if (!ds || this.loading() || this.last()) return;
        const next = this.page + 1;
        const seq = ++this.reqSeq;
        this.loading.set(true);
        try {
            const res = await ds.fetchPage(this.query, next, this.pageSize());
            if (seq !== this.reqSeq) return;
            this.page = next;
            this.options.update(list => [...list, ...res.items]);
            this.last.set(res.last);
        } catch {
            /* mantiene lo cargado; el usuario puede reintentar con scroll */
        } finally {
            if (seq === this.reqSeq) this.loading.set(false);
        }
    }

    private close(): void {
        this.open.set(false);
        this.activeIndex.set(-1);
        // Restaura el texto a la selección (descarta búsquedas sin confirmar).
        this.inputText.set(this.selectedLabel);
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(ev: MouseEvent): void {
        if (this.open() && !this.host.nativeElement.contains(ev.target as Node)) {
            this.onTouched();
            this.close();
        }
    }

    // ── ControlValueAccessor ──────────────────────────────────────────────────
    writeValue(v: ServerSelectId | null): void {
        if (v == null) {
            this.value.set(null);
            this.selectedLabel = '';
            this.inputText.set('');
            return;
        }
        // El effect del constructor resuelve el label cuando el dataSource esté listo.
        if (this.value() !== v) {
            this.selectedLabel = '';
        }
        this.value.set(v);
    }
    registerOnChange(fn: (v: ServerSelectId | null) => void): void { this.onChange = fn; }
    registerOnTouched(fn: () => void): void { this.onTouched = fn; }
    setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }
}

