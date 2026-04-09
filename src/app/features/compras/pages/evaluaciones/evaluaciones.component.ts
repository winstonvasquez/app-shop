import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EvaluacionService } from '../../services/evaluacion.service';
import { ProveedorService } from '../../services/proveedor.service';
import { EvaluacionProveedor } from '../../models/evaluacion.model';
import { Proveedor } from '../../models/proveedor.model';

@Component({
    selector: 'app-evaluaciones',
    standalone: true,
    imports: [DatePipe, DecimalPipe, ReactiveFormsModule],
    templateUrl: './evaluaciones.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluacionesComponent implements OnInit {
    private service = inject(EvaluacionService);
    private proveedorService = inject(ProveedorService);
    private fb = inject(FormBuilder);

    proveedores = signal<Proveedor[]>([]);
    evaluaciones = signal<EvaluacionProveedor[]>([]);
    selectedProveedor = signal<string>('');
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

    ngOnInit(): void {
        this.proveedorService.getProveedores(0, 200).subscribe(r => {
            this.proveedores.set(r.content ?? []);
        });
    }

    buscarEvaluaciones(): void {
        const id = this.selectedProveedor();
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
                if (this.selectedProveedor() === v.proveedorId) {
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
        if (p >= 90) return 'text-green-400';
        if (p >= 75) return 'text-blue-400';
        if (p >= 60) return 'text-yellow-400';
        return 'text-red-400';
    }
}
