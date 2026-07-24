import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { EvaluacionService } from '../../services/evaluacion.service';
import { ProveedorService } from '../../services/proveedor.service';
import { HistorialPrecio } from '../../models/evaluacion.model';
import { MONEDA } from '@shared/constants/sunat.constants';
import { proveedorSelectSource } from '../../components/select-sources';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent } from '@shared/components';

type BusquedaTipo = 'sku' | 'producto' | 'proveedor';

@Component({
    selector: 'app-historial-precios',
    standalone: true,
    imports: [DatePipe, DecimalPipe, FormsModule, ReactiveFormsModule, ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent],
    templateUrl: './historial-precios.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialPreciosComponent {
    private service = inject(EvaluacionService);
    private proveedorService = inject(ProveedorService);
    private fb = inject(FormBuilder);

    readonly proveedorSource = proveedorSelectSource(this.proveedorService);

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
        moneda: [MONEDA.PEN],
        fechaReferencia: [''],
    });

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
                this.form.reset({ moneda: MONEDA.PEN });
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
