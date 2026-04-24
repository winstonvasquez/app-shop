import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EvaluacionService } from '../../services/evaluacion.service';
import { ProveedorService } from '../../services/proveedor.service';
import { HistorialPrecio } from '../../models/evaluacion.model';
import { Proveedor } from '../../models/proveedor.model';
import { ButtonComponent } from '@shared/components';

type BusquedaTipo = 'sku' | 'producto' | 'proveedor';

@Component({
    selector: 'app-historial-precios',
    standalone: true,
    imports: [DatePipe, DecimalPipe, ReactiveFormsModule, ButtonComponent],
    templateUrl: './historial-precios.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialPreciosComponent {
    private service = inject(EvaluacionService);
    private proveedorService = inject(ProveedorService);
    private fb = inject(FormBuilder);

    proveedores = signal<Proveedor[]>([]);
    historial = signal<HistorialPrecio[]>([]);
    loading = signal(false);
    showForm = signal(false);
    saving = signal(false);
    tipoBusqueda = signal<BusquedaTipo>('sku');
    busquedaValor = signal('');

    form: FormGroup = this.fb.group({
        productoId: ['', Validators.required],
        sku: ['', Validators.required],
        productoNombre: ['', Validators.required],
        proveedorId: ['', Validators.required],
        precioUnitario: [null, [Validators.required, Validators.min(0.01)]],
        moneda: ['PEN'],
        fechaReferencia: [''],
    });

    constructor() {
        this.proveedorService.getProveedores(0, 200).subscribe(r => {
            this.proveedores.set(r.content ?? []);
        });
    }

    buscar(): void {
        const val = this.busquedaValor().trim();
        if (!val) return;
        this.loading.set(true);
        const obs = this.tipoBusqueda() === 'sku'
            ? this.service.getHistorialBySku(val)
            : this.tipoBusqueda() === 'producto'
                ? this.service.getHistorialByProducto(val)
                : this.service.getHistorialByProveedor(val);

        obs.subscribe({
            next: data => { this.historial.set(data); this.loading.set(false); },
            error: () => this.loading.set(false),
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.saving.set(true);
        const v = this.form.value;
        if (!v.fechaReferencia) delete v.fechaReferencia;
        this.service.registrarPrecio(v).subscribe({
            next: h => {
                this.historial.update(list => [h, ...list]);
                this.form.reset({ moneda: 'PEN' });
                this.showForm.set(false);
                this.saving.set(false);
            },
            error: () => this.saving.set(false),
        });
    }

    precioMinimo(sku: string): number {
        const precios = this.historial()
            .filter(h => h.sku === sku)
            .map(h => h.precioUnitario);
        return precios.length ? Math.min(...precios) : 0;
    }
}
