import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';

type EstadoEval = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';

interface Evaluacion {
    id: number;
    empleadoNombre: string;
    evaluadorNombre: string;
    periodo: string;
    competencias: string;
    puntaje?: number;
    estado: EstadoEval;
    fechaProgramada: string;
    comentarios?: string;
}

const DEMO_EVALUACIONES: Evaluacion[] = [
    { id: 1, empleadoNombre: 'Ana García López',    evaluadorNombre: 'Roberto Díaz',  periodo: '2026-Q1', competencias: 'Liderazgo, Comunicación, Trabajo en equipo', puntaje: 4, estado: 'COMPLETADA',  fechaProgramada: '2026-03-15' },
    { id: 2, empleadoNombre: 'Carlos Mendoza Ríos', evaluadorNombre: 'María Torres',  periodo: '2026-Q1', competencias: 'Productividad, Calidad, Iniciativa',           puntaje: 5, estado: 'COMPLETADA',  fechaProgramada: '2026-03-18' },
    { id: 3, empleadoNombre: 'Luis Vargas Huamán',  evaluadorNombre: 'Roberto Díaz',  periodo: '2026-Q2', competencias: 'Liderazgo, Gestión de proyectos',                           estado: 'EN_PROCESO',  fechaProgramada: '2026-04-10' },
    { id: 4, empleadoNombre: 'Patricia Soto Flores',evaluadorNombre: 'José Ramírez',  periodo: '2026-Q2', competencias: 'Atención al cliente, Comunicación',                          estado: 'PENDIENTE',   fechaProgramada: '2026-04-20' },
    { id: 5, empleadoNombre: 'Miguel Herrera Castro',evaluadorNombre:'María Torres',  periodo: '2026-Q2', competencias: 'Productividad, Calidad, Innovación',                         estado: 'PENDIENTE',   fechaProgramada: '2026-04-25' },
];

@Component({
    selector: 'app-evaluation-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DrawerComponent,
        DataTableComponent,
        PaginationComponent,
        FormFieldComponent,
        PageHeaderComponent,
        AlertComponent,
        DateInputComponent,
    ],
    templateUrl: './evaluation-list.component.html',
})
export class EvaluationListComponent {
    private readonly fb = inject(FormBuilder);

    // ── Data ─────────────────────────────────────────────────────────────────
    evaluaciones = signal<Evaluacion[]>(DEMO_EVALUACIONES);

    // ── UI state ──────────────────────────────────────────────────────────────
    showModal   = signal(false);
    submitting  = signal(false);
    submitError = signal<string | null>(null);

    // ── Filters ───────────────────────────────────────────────────────────────
    filtroEstado = signal('');

    // ── Pagination ────────────────────────────────────────────────────────────
    currentPage = signal(0);
    pageSize    = signal(10);

    // ── Computed ──────────────────────────────────────────────────────────────
    readonly evaluacionesFiltradas = computed(() => {
        const f = this.filtroEstado();
        return f ? this.evaluaciones().filter(e => e.estado === f) : this.evaluaciones();
    });

    readonly totalElements = computed(() => this.evaluacionesFiltradas().length);
    readonly totalPages    = computed(() => Math.ceil(this.totalElements() / this.pageSize()) || 1);

    readonly pagedData = computed(() => {
        const start = this.currentPage() * this.pageSize();
        return this.evaluacionesFiltradas().slice(start, start + this.pageSize());
    });

    readonly pendientes   = computed(() => this.evaluaciones().filter(e => e.estado === 'PENDIENTE' || e.estado === 'EN_PROCESO').length);
    readonly completadas  = computed(() => this.evaluaciones().filter(e => e.estado === 'COMPLETADA').length);

    // ── Breadcrumbs ───────────────────────────────────────────────────────────
    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'RRHH',  url: '/admin/rrhh/dashboard' },
        { label: 'Evaluaciones' },
    ];

    // ── Options ───────────────────────────────────────────────────────────────
    readonly estadoOptions = [
        { value: 'PENDIENTE',  label: 'Pendiente'  },
        { value: 'EN_PROCESO', label: 'En Proceso' },
        { value: 'COMPLETADA', label: 'Completada' },
        { value: 'CANCELADA',  label: 'Cancelada'  },
    ];

    // ── Columns ───────────────────────────────────────────────────────────────
    columns: TableColumn<Evaluacion>[] = [
        { key: 'empleadoNombre',  label: 'Empleado'   },
        { key: 'evaluadorNombre', label: 'Evaluador'  },
        { key: 'periodo',         label: 'Período'    },
        { key: 'competencias',    label: 'Competencias' },
        {
            key: 'fechaProgramada', label: 'Programada',
            render: row => new Date(row.fechaProgramada + 'T00:00').toLocaleDateString('es-PE')
        },
        {
            key: 'puntaje', label: 'Puntaje', align: 'center', html: true,
            render: row => row.puntaje
                ? `<span class="badge badge-${this.badgePuntaje(row.puntaje)}">${row.puntaje}/5</span>`
                : '<span style="color:var(--color-text-muted)">—</span>'
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: row => `<span class="badge badge-${this.badgeEval(row.estado)}">${row.estado}</span>`
        },
    ];

    actions: TableAction<Evaluacion>[] = [
        {
            label: 'Completar', icon: '✓', class: 'btn-view',
            show: row => row.estado === 'PENDIENTE' || row.estado === 'EN_PROCESO',
            onClick: row => this.completarEvaluacion(row),
        },
    ];

    // ── Form ──────────────────────────────────────────────────────────────────
    readonly evaluacionForm = this.fb.group({
        empleadoNombre:  ['', Validators.required],
        evaluadorNombre: ['', Validators.required],
        periodo:         ['', Validators.required],
        competencias:    [''],
        fechaProgramada: ['', Validators.required],
        comentarios:     [''],
    });

    // ── Handlers ─────────────────────────────────────────────────────────────
    onFilterEstado(event: Event): void {
        this.filtroEstado.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    openCreateModal(): void {
        this.evaluacionForm.reset();
        this.submitError.set(null);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.evaluacionForm.reset();
    }

    guardar(): void {
        if (this.evaluacionForm.invalid) {
            this.evaluacionForm.markAllAsTouched();
            return;
        }
        const val = this.evaluacionForm.value;
        const nueva: Evaluacion = {
            id:              Date.now(),
            empleadoNombre:  val.empleadoNombre!,
            evaluadorNombre: val.evaluadorNombre || 'Sin asignar',
            periodo:         val.periodo!,
            competencias:    val.competencias || 'General',
            estado:          'PENDIENTE',
            fechaProgramada: val.fechaProgramada!,
            comentarios:     val.comentarios ?? undefined,
        };
        this.evaluaciones.update(list => [...list, nueva]);
        this.closeModal();
    }

    completarEvaluacion(ev: Evaluacion): void {
        const puntaje = prompt(`Puntaje para "${ev.empleadoNombre}" (1-5):`);
        if (!puntaje) return;
        const num = parseInt(puntaje, 10);
        if (isNaN(num) || num < 1 || num > 5) { alert('Puntaje debe ser entre 1 y 5'); return; }
        this.evaluaciones.update(list =>
            list.map(e => e.id === ev.id ? { ...e, estado: 'COMPLETADA' as EstadoEval, puntaje: num } : e)
        );
    }

    getControl(name: string): FormControl {
        return this.evaluacionForm.get(name) as FormControl;
    }

    badgeEval(estado: EstadoEval): string {
        const map: Record<EstadoEval, string> = {
            PENDIENTE:  'warning',
            EN_PROCESO: 'accent',
            COMPLETADA: 'success',
            CANCELADA:  'neutral',
        };
        return map[estado] ?? 'neutral';
    }

    badgePuntaje(p: number): string {
        if (p >= 4) return 'success';
        if (p >= 3) return 'warning';
        return 'error';
    }
}
