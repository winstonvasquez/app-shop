import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EvaluacionService } from '../../services/evaluacion.service';
import { ProveedorService } from '../../services/proveedor.service';
import { EvaluacionProveedor } from '../../models/evaluacion.model';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { proveedorSelectSource } from '../../components/select-sources';

@Component({
    selector: 'app-evaluaciones',
    standalone: true,
    imports: [DatePipe, DecimalPipe, ReactiveFormsModule, ButtonComponent, ServerSearchSelectComponent],
    templateUrl: './evaluaciones.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluacionesComponent {
    private service = inject(EvaluacionService);
    private proveedorService = inject(ProveedorService);
    private fb = inject(FormBuilder);

    readonly proveedorSource = proveedorSelectSource(this.proveedorService);

    evaluaciones = signal<EvaluacionProveedor[]>([]);
    filtroProveedorId = new FormControl<string>('');
    showForm = signal(false);
    saving = signal(false);
    loading = signal(false);

    form: FormGroup = this.fb.group({
        proveedorId: ['', Validators.required],
        puntajeEntrega: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
        puntajeCalidad: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
        puntajePrecio: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
        puntajeServicio: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
        comentarios: [''],
    });

    buscarEvaluaciones(): void {
        const id = this.filtroProveedorId.value;
        if (!id) return;
        this.loading.set(true);
        this.service.getEvaluacionesByProveedor(id).subscribe({
            next: data => { this.evaluaciones.set(data); this.loading.set(false); },
            error: () => this.loading.set(false),
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.saving.set(true);
        const v = this.form.value;
        this.service.crearEvaluacion(v).subscribe({
            next: ev => {
                if (this.filtroProveedorId.value === v.proveedorId) {
                    this.evaluaciones.update(list => [ev, ...list]);
                }
                this.form.reset({ puntajeEntrega: 80, puntajeCalidad: 80, puntajePrecio: 80, puntajeServicio: 80 });
                this.showForm.set(false);
                this.saving.set(false);
            },
            error: () => this.saving.set(false),
        });
    }

    nivelClass(nivel: string): string {
        const map: Record<string, string> = {
            EXCELENTE: 'badge-success',
            BUENO: 'badge-accent',
            REGULAR: 'badge-warning',
            DEFICIENTE: 'badge-error',
        };
        return `badge ${map[nivel] ?? 'badge-neutral'}`;
    }

    puntajeColor(p: number): string {
        if (p >= 90) return 'text-success';
        if (p >= 75) return 'text-info';
        if (p >= 60) return 'text-warning';
        return 'text-error';
    }
}
