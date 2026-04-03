import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';

type EstadoCap = 'PLANIFICADA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA';
type Modalidad = 'PRESENCIAL' | 'VIRTUAL' | 'MIXTA';

interface Capacitacion {
    id: number;
    nombre: string;
    descripcion: string;
    modalidad: Modalidad;
    instructor: string;
    fechaInicio: string;
    fechaFin: string;
    horasTotales: number;
    participantes: number;
    estado: EstadoCap;
    area: string;
}

const DEMO_CAPACITACIONES: Capacitacion[] = [
    { id: 1, nombre: 'Seguridad y Salud en el Trabajo',    descripcion: 'Capacitación obligatoria MINTRA para todos los colaboradores', modalidad: 'PRESENCIAL', instructor: 'Ing. Roberto Salinas',  fechaInicio: '2026-03-10', fechaFin: '2026-03-12', horasTotales: 24, participantes: 35, estado: 'COMPLETADA',  area: 'Todas'          },
    { id: 2, nombre: 'Excel Avanzado para Gestión',         descripcion: 'Tablas dinámicas, macros y Power Query para análisis de datos',  modalidad: 'VIRTUAL',    instructor: 'Lic. Carmen Vásquez', fechaInicio: '2026-03-20', fechaFin: '2026-03-27', horasTotales: 16, participantes: 20, estado: 'COMPLETADA',  area: 'Administración' },
    { id: 3, nombre: 'Atención al Cliente de Excelencia',  descripcion: 'Técnicas de servicio, manejo de quejas y fidelización',         modalidad: 'MIXTA',      instructor: 'Lic. Andrea Morales', fechaInicio: '2026-04-07', fechaFin: '2026-04-11', horasTotales: 20, participantes: 15, estado: 'EN_CURSO',   area: 'Ventas'         },
    { id: 4, nombre: 'Liderazgo y Gestión de Equipos',     descripcion: 'Coaching, comunicación asertiva y gestión del cambio',          modalidad: 'PRESENCIAL', instructor: 'Dr. Fernando Ramos',  fechaInicio: '2026-04-22', fechaFin: '2026-04-24', horasTotales: 24, participantes: 12, estado: 'PLANIFICADA', area: 'Gerencia'       },
    { id: 5, nombre: 'Angular para Desarrollo Interno',    descripcion: 'Signals, standalone components y arquitectura moderna',         modalidad: 'VIRTUAL',    instructor: 'Ing. Luis Paredes',   fechaInicio: '2026-05-05', fechaFin: '2026-05-16', horasTotales: 40, participantes: 8,  estado: 'PLANIFICADA', area: 'Sistemas'       },
];

@Component({
    selector: 'app-training-list',
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
    templateUrl: './training-list.component.html',
})
export class TrainingListComponent {
    private readonly fb = inject(FormBuilder);

    // ── Data ─────────────────────────────────────────────────────────────────
    capacitaciones = signal<Capacitacion[]>(DEMO_CAPACITACIONES);

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
    readonly capacitacionesFiltradas = computed(() => {
        const f = this.filtroEstado();
        return f ? this.capacitaciones().filter(c => c.estado === f) : this.capacitaciones();
    });

    readonly totalElements = computed(() => this.capacitacionesFiltradas().length);
    readonly totalPages    = computed(() => Math.ceil(this.totalElements() / this.pageSize()) || 1);

    readonly pagedData = computed(() => {
        const start = this.currentPage() * this.pageSize();
        return this.capacitacionesFiltradas().slice(start, start + this.pageSize());
    });

    readonly planificadas = computed(() => this.capacitaciones().filter(c => c.estado === 'PLANIFICADA').length);
    readonly enCurso      = computed(() => this.capacitaciones().filter(c => c.estado === 'EN_CURSO').length);
    readonly completadas  = computed(() => this.capacitaciones().filter(c => c.estado === 'COMPLETADA').length);
    readonly totalHoras   = computed(() =>
        this.capacitaciones().filter(c => c.estado === 'COMPLETADA').reduce((s, c) => s + c.horasTotales, 0)
    );

    // ── Breadcrumbs ───────────────────────────────────────────────────────────
    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'RRHH',  url: '/admin/rrhh/dashboard' },
        { label: 'Capacitaciones' },
    ];

    // ── Options ───────────────────────────────────────────────────────────────
    readonly estadoOptions = [
        { value: 'PLANIFICADA', label: 'Planificada' },
        { value: 'EN_CURSO',    label: 'En Curso'    },
        { value: 'COMPLETADA',  label: 'Completada'  },
        { value: 'CANCELADA',   label: 'Cancelada'   },
    ];

    readonly modalidadOptions: { value: Modalidad; label: string }[] = [
        { value: 'PRESENCIAL', label: 'Presencial' },
        { value: 'VIRTUAL',    label: 'Virtual'    },
        { value: 'MIXTA',      label: 'Mixta'      },
    ];

    // ── Columns ───────────────────────────────────────────────────────────────
    columns: TableColumn<Capacitacion>[] = [
        {
            key: 'nombre', label: 'Curso',
            render: row => row.nombre
        },
        {
            key: 'modalidad', label: 'Modalidad', html: true,
            render: row => `<span class="badge badge-${this.badgeModalidad(row.modalidad)}">${row.modalidad}</span>`
        },
        { key: 'instructor',    label: 'Instructor' },
        { key: 'area',          label: 'Área' },
        {
            key: 'fechaInicio', label: 'Inicio',
            render: row => new Date(row.fechaInicio + 'T00:00').toLocaleDateString('es-PE')
        },
        {
            key: 'fechaFin', label: 'Fin',
            render: row => new Date(row.fechaFin + 'T00:00').toLocaleDateString('es-PE')
        },
        { key: 'horasTotales',  label: 'Horas',  align: 'center', render: row => `${row.horasTotales}h` },
        { key: 'participantes', label: 'Partic.', align: 'center', render: row => `${row.participantes}` },
        {
            key: 'estado', label: 'Estado', html: true,
            render: row => `<span class="badge badge-${this.badgeCap(row.estado)}">${row.estado}</span>`
        },
    ];

    actions: TableAction<Capacitacion>[] = [
        {
            label: 'Iniciar', icon: '▶', class: 'btn-view',
            show: row => row.estado === 'PLANIFICADA',
            onClick: row => this.iniciarCapacitacion(row),
        },
        {
            label: 'Completar', icon: '✓', class: 'btn-view',
            show: row => row.estado === 'EN_CURSO',
            onClick: row => this.completarCapacitacion(row),
        },
    ];

    // ── Form ──────────────────────────────────────────────────────────────────
    readonly capacitacionForm = this.fb.group({
        nombre:       ['', Validators.required],
        descripcion:  [''],
        modalidad:    ['PRESENCIAL', Validators.required],
        instructor:   [''],
        fechaInicio:  ['', Validators.required],
        fechaFin:     [''],
        horasTotales: [0, [Validators.required, Validators.min(1)]],
        area:         [''],
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
        this.capacitacionForm.reset({ modalidad: 'PRESENCIAL', horasTotales: 0 });
        this.submitError.set(null);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.capacitacionForm.reset();
    }

    guardar(): void {
        if (this.capacitacionForm.invalid) {
            this.capacitacionForm.markAllAsTouched();
            return;
        }
        const val = this.capacitacionForm.value;
        const nueva: Capacitacion = {
            id:           Date.now(),
            nombre:       val.nombre!,
            descripcion:  val.descripcion || '',
            modalidad:    (val.modalidad as Modalidad) || 'PRESENCIAL',
            instructor:   val.instructor || 'Por confirmar',
            fechaInicio:  val.fechaInicio!,
            fechaFin:     val.fechaFin   || val.fechaInicio!,
            horasTotales: val.horasTotales || 0,
            participantes:0,
            estado:       'PLANIFICADA',
            area:         val.area || 'General',
        };
        this.capacitaciones.update(list => [...list, nueva]);
        this.closeModal();
    }

    iniciarCapacitacion(cap: Capacitacion): void {
        this.capacitaciones.update(list =>
            list.map(c => c.id === cap.id ? { ...c, estado: 'EN_CURSO' as EstadoCap } : c)
        );
    }

    completarCapacitacion(cap: Capacitacion): void {
        this.capacitaciones.update(list =>
            list.map(c => c.id === cap.id ? { ...c, estado: 'COMPLETADA' as EstadoCap } : c)
        );
    }

    getControl(name: string): FormControl {
        return this.capacitacionForm.get(name) as FormControl;
    }

    badgeCap(estado: EstadoCap): string {
        const map: Record<EstadoCap, string> = {
            PLANIFICADA: 'warning',
            EN_CURSO:    'accent',
            COMPLETADA:  'success',
            CANCELADA:   'neutral',
        };
        return map[estado] ?? 'neutral';
    }

    badgeModalidad(m: Modalidad): string {
        const map: Record<Modalidad, string> = {
            PRESENCIAL: 'neutral',
            VIRTUAL:    'accent',
            MIXTA:      'warning',
        };
        return map[m] ?? 'neutral';
    }
}
