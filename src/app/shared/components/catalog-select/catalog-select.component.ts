import {
    ChangeDetectionStrategy, Component, computed, forwardRef, inject, input, signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CatalogService } from '@core/services/catalog.service';

/**
 * Select reutilizable cuyas opciones provienen de un catálogo del backend
 * (erp_parameters), NO de <option> hardcodeados. Implementa ControlValueAccessor,
 * así que funciona con `formControlName`, `[(ngModel)]` o `[formControl]`.
 *
 * Uso:
 *   <app-catalog-select tabla="AFP" formControlName="afpNombre"
 *                       placeholder="Seleccione una AFP…" />
 */
@Component({
    selector: 'app-catalog-select',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => CatalogSelectComponent),
        multi: true,
    }],
    template: `
        <select class="form-control" [value]="value()" [disabled]="disabled()"
                (change)="onSelect($any($event.target).value)" (blur)="onTouched()">
            @if (placeholder()) {
                <option value="">{{ placeholder() }}</option>
            }
            @for (opt of options(); track opt.codigo) {
                <option [value]="opt.codigo">{{ opt.valor }}</option>
            }
        </select>
    `,
})
export class CatalogSelectComponent implements ControlValueAccessor {
    private readonly catalog = inject(CatalogService);

    /** Nombre del catálogo (TABLA), ej. "AFP", "MONEDA", "ESTADO_EMPLEADO". */
    readonly tabla = input.required<string>();
    /** Opción vacía inicial; si es '' no se muestra placeholder. */
    readonly placeholder = input<string>('');

    /** Opciones reactivas: reaccionan a cambios de `tabla` y a la carga async del catálogo. */
    readonly options = computed(() => this.catalog.options(this.tabla())());

    readonly value = signal<string>('');
    readonly disabled = signal(false);

    private onChange: (v: string) => void = () => { /* set por Angular */ };
    onTouched: () => void = () => { /* set por Angular */ };

    onSelect(v: string): void {
        this.value.set(v);
        this.onChange(v);
        this.onTouched();
    }

    // ── ControlValueAccessor ──────────────────────────────────────────────
    writeValue(v: string | null): void {
        this.value.set(v ?? '');
    }
    registerOnChange(fn: (v: string) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
    setDisabledState(isDisabled: boolean): void {
        this.disabled.set(isDisabled);
    }
}
