import {
    ChangeDetectionStrategy, Component, computed, forwardRef, inject, input, signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { UbigeoService } from '@core/services/ubigeo.service';

/**
 * Selects encadenados de departamento → provincia → distrito, con el ubigeo oficial del INEI.
 *
 * El valor que expone al formulario es el **código de ubigeo de 6 dígitos** del distrito, que es
 * lo que SUNAT exige en la guía de remisión electrónica. Los dos primeros selects son sólo
 * navegación: no escriben nada en el control hasta que hay distrito elegido.
 *
 * Uso:
 *   <app-ubigeo-select formControlName="ubigeo" />
 *
 * Detalle que evita un fetch: el código INEI es jerárquico por construcción — los 2 primeros
 * dígitos son el departamento y los 4 primeros la provincia. Así que al recibir un valor ya
 * guardado (`writeValue`) se deriva la cadena por substring, sin ir al backend a preguntar de
 * dónde viene ese distrito.
 */
@Component({
    selector: 'app-ubigeo-select',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => UbigeoSelectComponent),
        multi: true,
    }],
    template: `
        <div class="ubigeo-select">
            <select class="form-control" [value]="departamentoCodigo()" [disabled]="disabled()"
                    (change)="onDepartamento($any($event.target).value)" (blur)="onTouched()"
                    aria-label="Departamento">
                <option value="">{{ placeholderDepartamento() }}</option>
                @for (opt of departamentos(); track opt.codigo) {
                    <option [value]="opt.codigo">{{ opt.valor }}</option>
                }
            </select>

            <select class="form-control" [value]="provinciaCodigo()"
                    [disabled]="disabled() || !departamentoCodigo()"
                    (change)="onProvincia($any($event.target).value)" (blur)="onTouched()"
                    aria-label="Provincia">
                <option value="">{{ placeholderProvincia() }}</option>
                @for (opt of provincias(); track opt.codigo) {
                    <option [value]="opt.codigo">{{ opt.valor }}</option>
                }
            </select>

            <select class="form-control" [value]="value()"
                    [disabled]="disabled() || !provinciaCodigo()"
                    (change)="onDistrito($any($event.target).value)" (blur)="onTouched()"
                    aria-label="Distrito">
                <option value="">{{ placeholderDistrito() }}</option>
                @for (opt of distritos(); track opt.codigo) {
                    <option [value]="opt.codigo">{{ opt.valor }}</option>
                }
            </select>
        </div>
    `,
    styles: [`
        .ubigeo-select {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.5rem;
        }
        @media (max-width: 640px) {
            .ubigeo-select { grid-template-columns: 1fr; }
        }
    `],
})
export class UbigeoSelectComponent implements ControlValueAccessor {
    private readonly ubigeo = inject(UbigeoService);

    readonly placeholderDepartamento = input<string>('Departamento…');
    readonly placeholderProvincia = input<string>('Provincia…');
    readonly placeholderDistrito = input<string>('Distrito…');

    /** Código de 6 dígitos del distrito: lo único que se persiste. */
    readonly value = signal<string>('');
    readonly disabled = signal(false);

    /** Navegación, derivada del valor o de lo que el usuario va eligiendo. */
    readonly departamentoCodigo = signal<string>('');
    readonly provinciaCodigo = signal<string>('');

    readonly departamentos = computed(() => this.ubigeo.departamentos()());
    readonly provincias = computed(() => this.ubigeo.provincias(this.departamentoCodigo())());
    readonly distritos = computed(() => this.ubigeo.distritos(this.provinciaCodigo())());

    private onChange: (v: string) => void = () => { /* set por Angular */ };
    onTouched: () => void = () => { /* set por Angular */ };

    /**
     * Cambiar de departamento invalida provincia y distrito, así que el control queda vacío:
     * dejar el distrito anterior daría un ubigeo que ya no corresponde a lo que se ve en pantalla.
     */
    onDepartamento(codigo: string): void {
        this.departamentoCodigo.set(codigo);
        this.provinciaCodigo.set('');
        this.setValor('');
    }

    onProvincia(codigo: string): void {
        this.provinciaCodigo.set(codigo);
        this.setValor('');
    }

    onDistrito(codigo: string): void {
        this.setValor(codigo);
    }

    private setValor(v: string): void {
        this.value.set(v);
        this.onChange(v);
        this.onTouched();
    }

    // ── ControlValueAccessor ──────────────────────────────────────────────
    writeValue(v: string | null): void {
        const codigo = (v ?? '').trim();
        this.value.set(codigo);
        // El código INEI es jerárquico: 2 dígitos de departamento + 2 de provincia + 2 de distrito.
        this.departamentoCodigo.set(codigo.length === 6 ? codigo.slice(0, 2) : '');
        this.provinciaCodigo.set(codigo.length === 6 ? codigo.slice(0, 4) : '');
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
