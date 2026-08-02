import {
    ChangeDetectionStrategy, Component, ElementRef, computed, forwardRef, inject, input, signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Opción del selector. El `id` es lo que viaja en el valor del control. */
export interface MultiCheckOption {
    id: number | string;
    label: string;
}

/**
 * Selector múltiple con buscador y casillas, para sustituir una lista larga de
 * checkboxes (que obliga a hacer scroll dentro del formulario y no permite buscar).
 *
 * Implementa ControlValueAccessor sobre un array de ids, así que funciona con
 * `formControlName`, `[formControl]` o `[(ngModel)]`.
 *
 * Uso:
 *   <app-multi-check-select [options]="categorias()" formControlName="categoriaIds"
 *                          placeholder="Selecciona categorías…" />
 */
@Component({
    selector: 'app-multi-check-select',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => MultiCheckSelectComponent),
        multi: true,
    }],
    template: `
        <div class="mcs" [class.mcs--disabled]="disabled()">
            <button type="button" class="mcs__trigger" [disabled]="disabled()"
                    [attr.aria-expanded]="open()" aria-haspopup="listbox"
                    (click)="toggleOpen()">
                <span class="mcs__summary">
                    @if (selected().length === 0) {
                        <span class="mcs__placeholder">{{ placeholder() }}</span>
                    } @else {
                        {{ selected().length }} seleccionada(s)
                    }
                </span>
                <span class="mcs__caret" aria-hidden="true">▾</span>
            </button>

            @if (selected().length > 0) {
                <div class="mcs__chips">
                    @for (opt of selectedOptions(); track opt.id) {
                        <span class="mcs__chip">
                            {{ opt.label }}
                            <button type="button" class="mcs__chip-x" [disabled]="disabled()"
                                    [attr.aria-label]="'Quitar ' + opt.label"
                                    (click)="toggle(opt.id)">✕</button>
                        </span>
                    }
                </div>
            }

            @if (open()) {
                <div class="mcs__panel" role="listbox" aria-multiselectable="true">
                    <input class="mcs__search" type="search" autocomplete="off"
                           [placeholder]="searchPlaceholder()"
                           [value]="query()"
                           (input)="query.set($any($event.target).value)" />

                    <div class="mcs__toolbar">
                        <button type="button" class="mcs__link" (click)="seleccionarVisibles()">
                            Seleccionar {{ query() ? 'lo filtrado' : 'todo' }}
                        </button>
                        <button type="button" class="mcs__link" (click)="limpiar()">Limpiar</button>
                    </div>

                    <div class="mcs__list">
                        @for (opt of filtered(); track opt.id) {
                            <label class="mcs__item" [class.mcs__item--on]="isSelected(opt.id)">
                                <input type="checkbox" [checked]="isSelected(opt.id)"
                                       (change)="toggle(opt.id)" />
                                <span>{{ opt.label }}</span>
                            </label>
                        } @empty {
                            <p class="mcs__empty">
                                {{ options().length === 0 ? 'Sin opciones disponibles' : 'Nada coincide con la búsqueda' }}
                            </p>
                        }
                    </div>
                </div>
            }
        </div>
    `,
    styles: [`
        .mcs { position: relative; }
        .mcs--disabled { opacity: .6; pointer-events: none; }
        .mcs__trigger { display: flex; align-items: center; justify-content: space-between; gap: 8px;
            width: 100%; padding: 8px 10px; border: 1px solid var(--color-border, #d4d4d8);
            border-radius: 8px; background: var(--color-surface, #fff); color: inherit; font: inherit; cursor: pointer; }
        .mcs__trigger:hover:not(:disabled) { border-color: var(--color-primary, #2563eb); }
        .mcs__placeholder { color: var(--color-text-muted, #a1a1aa); }
        .mcs__caret { font-size: 11px; opacity: .7; }
        .mcs__chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .mcs__chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px;
            border-radius: 999px; font-size: 12px;
            background: color-mix(in srgb, var(--color-primary, #2563eb) 12%, transparent);
            color: var(--color-primary, #2563eb); }
        .mcs__chip-x { border: 0; background: transparent; color: inherit; cursor: pointer; font-size: 11px; padding: 0; line-height: 1; }
        .mcs__panel { position: absolute; z-index: 30; left: 0; right: 0; margin-top: 4px; padding: 8px;
            border: 1px solid var(--color-border, #d4d4d8); border-radius: 8px;
            background: var(--color-surface, #fff); box-shadow: 0 8px 24px rgb(0 0 0 / .12); }
        .mcs__search { width: 100%; padding: 7px 9px; border: 1px solid var(--color-border, #e4e4e7);
            border-radius: 6px; font: inherit; background: var(--color-surface, #fff); color: inherit; }
        .mcs__toolbar { display: flex; gap: 12px; padding: 6px 2px; }
        .mcs__link { border: 0; background: transparent; padding: 0; font-size: 12px; cursor: pointer;
            color: var(--color-primary, #2563eb); text-decoration: underline; }
        .mcs__list { max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
        .mcs__item { display: flex; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 6px; cursor: pointer; }
        .mcs__item:hover { background: var(--color-surface-hover, #f4f4f5); }
        .mcs__item--on { background: color-mix(in srgb, var(--color-primary, #2563eb) 8%, transparent); }
        .mcs__empty { margin: 6px; font-size: 13px; color: var(--color-text-muted, #a1a1aa); }
    `],
    host: { '(document:click)': 'onDocumentClick($event)' },
})
export class MultiCheckSelectComponent implements ControlValueAccessor {
    private readonly self = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly options = input<MultiCheckOption[]>([]);
    readonly placeholder = input('Selecciona…');
    readonly searchPlaceholder = input('Buscar…');

    readonly open = signal(false);
    readonly query = signal('');
    readonly disabled = signal(false);
    readonly selected = signal<(number | string)[]>([]);

    readonly filtered = computed(() => {
        const q = this.query().trim().toLowerCase();
        const opts = this.options();
        return q ? opts.filter(o => o.label.toLowerCase().includes(q)) : opts;
    });

    /** Chips en el orden en que se muestran las opciones, no en el de selección. */
    readonly selectedOptions = computed(() => {
        const ids = new Set(this.selected().map(String));
        return this.options().filter(o => ids.has(String(o.id)));
    });

    private onChange: (v: (number | string)[]) => void = () => { /* set por Angular */ };
    private onTouched: () => void = () => { /* set por Angular */ };

    toggleOpen(): void {
        this.open.update(v => !v);
        if (!this.open()) this.onTouched();
    }

    isSelected(id: number | string): boolean {
        return this.selected().some(v => String(v) === String(id));
    }

    toggle(id: number | string): void {
        const next = this.isSelected(id)
            ? this.selected().filter(v => String(v) !== String(id))
            : [...this.selected(), id];
        this.emit(next);
    }

    /** Añade lo que hay a la vista; con el buscador activo respeta el filtro. */
    seleccionarVisibles(): void {
        const ids = this.filtered().map(o => o.id);
        const yaEstan = new Set(this.selected().map(String));
        this.emit([...this.selected(), ...ids.filter(id => !yaEstan.has(String(id)))]);
    }

    limpiar(): void {
        this.emit([]);
    }

    /** Cierra al hacer clic fuera; sin esto el panel tapa el resto del formulario. */
    onDocumentClick(ev: MouseEvent): void {
        if (this.open() && !this.self.nativeElement.contains(ev.target as Node)) {
            this.open.set(false);
            this.onTouched();
        }
    }

    // ── ControlValueAccessor ──────────────────────────────────────────────
    writeValue(value: (number | string)[] | null): void {
        this.selected.set(value ?? []);
    }

    registerOnChange(fn: (v: (number | string)[]) => void): void { this.onChange = fn; }
    registerOnTouched(fn: () => void): void { this.onTouched = fn; }
    setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }

    private emit(next: (number | string)[]): void {
        this.selected.set(next);
        this.onChange(next);
        this.onTouched();
    }
}
