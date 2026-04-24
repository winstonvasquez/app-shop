import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EvaluacionService } from '../../services/evaluacion.service';
import { PresupuestoCompras } from '../../models/evaluacion.model';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-presupuestos',
    standalone: true,
    imports: [DecimalPipe, ReactiveFormsModule, ButtonComponent],
    templateUrl: './presupuestos.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresupuestosComponent implements OnInit {
    private service = inject(EvaluacionService);
    private fb = inject(FormBuilder);

    presupuestos = signal<PresupuestoCompras[]>([]);
    loading = signal(false);
    showForm = signal(false);
    saving = signal(false);
    filtroPeriodo = signal('');

    form: FormGroup = this.fb.group({
        periodo: ['', Validators.required],
        categoria: ['', Validators.required],
        montoAsignado: [null, [Validators.required, Validators.min(1)]],
    });

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.loading.set(true);
        const periodo = this.filtroPeriodo() || undefined;
        this.service.listarPresupuestos(periodo).subscribe({
            next: data => { this.presupuestos.set(data); this.loading.set(false); },
            error: () => this.loading.set(false),
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.saving.set(true);
        const v = this.form.value;
        this.service.crearPresupuesto(v.periodo, v.categoria, v.montoAsignado).subscribe({
            next: p => {
                this.presupuestos.update(list => [p, ...list]);
                this.form.reset();
                this.showForm.set(false);
                this.saving.set(false);
            },
            error: () => this.saving.set(false),
        });
    }

    estadoClass(estado: string): string {
        const map: Record<string, string> = {
            DISPONIBLE: 'badge-success',
            EN_EJECUCION: 'badge-accent',
            COMPROMETIDO: 'badge-warning',
            AGOTADO: 'badge-error',
            SOBREEJECUTADO: 'badge-error',
        };
        return `badge ${map[estado] ?? 'badge-neutral'}`;
    }

    periodos(): string[] {
        const set = new Set(this.presupuestos().map(p => p.periodo));
        return Array.from(set).sort().reverse();
    }
}
