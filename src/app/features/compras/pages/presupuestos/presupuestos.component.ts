import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { EvaluacionService } from '../../services/evaluacion.service';
import { PresupuestoCompras } from '../../models/evaluacion.model';
import { ButtonComponent } from '@shared/components';
import { environment } from '@env/environment';
import {
    DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { signalFilter } from '@shared/ui/tables/data-table/filter-helpers';

@Component({
    selector: 'app-presupuestos',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonComponent, DataTableComponent],
    templateUrl: './presupuestos.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresupuestosComponent implements OnInit {
    private service = inject(EvaluacionService);
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private fb = inject(FormBuilder);

    // Data
    presupuestos = signal<PresupuestoCompras[]>([]);
    loading = signal(false);
    showForm = signal(false);
    saving = signal(false);

    /** Categorías de gasto para el select de filtro (GET /purchases/api/catalogo/categorias). */
    categoriasFiltro = signal<string[]>([]);

    // Drawer editar monto asignado
    selectedPresupuesto = signal<PresupuestoCompras | null>(null);
    showMontoDrawer = signal(false);

    // Filtros (TODOS server-side — la vista nunca filtra la lista cargada)
    filterCategoria = signal('');
    /** Rango de periodos YYYY-MM: inputs propios (no son fechas reales, no aplica <app-date-input>). */
    filterPeriodoDesde = signal('');
    filterPeriodoHasta = signal('');

    // NOTA: NO se agrega select de `estado` — el catálogo ESTADO_PRESUPUESTO_COMPRAS no existe
    // (solo hay un valor real 'ACTIVO' en BD); ver CONTRATOS-CAMBIADOS.md "Incoherencias conocidas".
    filters: FilterConfig[] = [
        signalFilter('categoria', 'Categoría', this.categoriasFiltro,
            c => ({ value: c, label: c })),
    ];

    columns: TableColumn<PresupuestoCompras>[] = [
        { key: 'periodo', label: 'Periodo' },
        { key: 'categoria', label: 'Categoría' },
        { key: 'montoAsignado', label: 'Asignado', align: 'right', render: (r) => `S/ ${r.montoAsignado.toFixed(2)}` },
        { key: 'montoEjecutado', label: 'Ejecutado', align: 'right', render: (r) => `S/ ${r.montoEjecutado.toFixed(2)}` },
        { key: 'montoComprometido', label: 'Comprometido', align: 'right', render: (r) => `S/ ${r.montoComprometido.toFixed(2)}` },
        {
            key: 'disponible', label: 'Disponible', align: 'right', html: true,
            render: (r) => `<span class="${r.disponible < 0 ? 'text-error' : 'text-success'} font-semibold">S/ ${r.disponible.toFixed(2)}</span>`
        },
        {
            key: 'porcentajeEjecucion', label: 'Ejecución', align: 'center',
            render: (r) => `${r.porcentajeEjecucion.toFixed(1)}%`
        },
        {
            key: 'estado', label: 'Estado', align: 'center', html: true,
            render: (r) => `<span class="${this.estadoClass(r.estado)}">${r.estado}</span>`
        },
    ];

    actions: TableAction<PresupuestoCompras>[] = [
        { label: 'Editar monto asignado', icon: '✏', class: 'btn-icon-edit', onClick: (row) => this.iniciarEditMonto(row) },
    ];

    form: FormGroup = this.fb.group({
        periodo: ['', Validators.required],
        categoria: ['', Validators.required],
        montoAsignado: [null, [Validators.required, Validators.min(1)]],
    });

    montoForm: FormGroup = this.fb.group({
        nuevoMonto: [0, [Validators.required, Validators.min(0)]],
    });

    ngOnInit(): void {
        this.cargar();
        this.loadCategoriasFiltro();
    }

    /** Categorías de gasto para el select de filtro del toolbar. */
    private loadCategoriasFiltro(): void {
        const companyId = String(this.authService.currentUser()?.activeCompanyId ?? '');
        this.http.get<string[]>(`${environment.apiUrls.purchases}/api/catalogo/categorias`,
            { headers: { 'X-Company-Id': companyId } }
        ).subscribe({
            next: (cats) => this.categoriasFiltro.set(cats ?? []),
            error: () => this.categoriasFiltro.set([])
        });
    }

    cargar(): void {
        this.loading.set(true);
        this.service.listarPresupuestos({
            categoria: this.filterCategoria() || undefined,
            periodoDesde: this.filterPeriodoDesde() || undefined,
            periodoHasta: this.filterPeriodoHasta() || undefined,
        }).subscribe({
            next: data => { this.presupuestos.set(data); this.loading.set(false); },
            error: () => this.loading.set(false),
        });
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field !== 'categoria') return;
        this.filterCategoria.set(event.value != null ? String(event.value) : '');
        this.cargar();
    }

    /** Rango de periodos: controles propios (YYYY-MM), fuera del data-table. */
    onPeriodoDesdeChange(value: string): void {
        this.filterPeriodoDesde.set(value);
        this.cargar();
    }

    onPeriodoHastaChange(value: string): void {
        this.filterPeriodoHasta.set(value);
        this.cargar();
    }

    /** "Limpiar filtros": resetea todo (incluido el rango de periodo) y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.filterCategoria.set('');
        this.filterPeriodoDesde.set('');
        this.filterPeriodoHasta.set('');
        this.cargar();
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.saving.set(true);
        const v = this.form.value;
        this.service.crearPresupuesto(v.periodo, v.categoria, v.montoAsignado).subscribe({
            next: () => {
                this.form.reset();
                this.showForm.set(false);
                this.saving.set(false);
                this.cargar();
            },
            error: () => this.saving.set(false),
        });
    }

    iniciarEditMonto(p: PresupuestoCompras): void {
        this.selectedPresupuesto.set(p);
        this.montoForm.setValue({ nuevoMonto: p.montoAsignado });
        this.showMontoDrawer.set(true);
    }

    guardarMonto(): void {
        const p = this.selectedPresupuesto();
        if (!p || this.montoForm.invalid) return;
        this.service.actualizarMontoAsignado(p.id, this.montoForm.value.nuevoMonto).subscribe({
            next: () => {
                this.showMontoDrawer.set(false);
                this.selectedPresupuesto.set(null);
                this.cargar();
            },
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
}
