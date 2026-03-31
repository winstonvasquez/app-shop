import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DrawerComponent } from '../../../../shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';

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
    {
        id: 1,
        nombre: 'Seguridad y Salud en el Trabajo',
        descripcion: 'Capacitación obligatoria MINTRA para todos los colaboradores',
        modalidad: 'PRESENCIAL',
        instructor: 'Ing. Roberto Salinas',
        fechaInicio: '2026-03-10',
        fechaFin: '2026-03-12',
        horasTotales: 24,
        participantes: 35,
        estado: 'COMPLETADA',
        area: 'Todas'
    },
    {
        id: 2,
        nombre: 'Excel Avanzado para Gestión',
        descripcion: 'Tablas dinámicas, macros y Power Query para análisis de datos',
        modalidad: 'VIRTUAL',
        instructor: 'Lic. Carmen Vásquez',
        fechaInicio: '2026-03-20',
        fechaFin: '2026-03-27',
        horasTotales: 16,
        participantes: 20,
        estado: 'COMPLETADA',
        area: 'Administración'
    },
    {
        id: 3,
        nombre: 'Atención al Cliente de Excelencia',
        descripcion: 'Técnicas de servicio, manejo de quejas y fidelización',
        modalidad: 'MIXTA',
        instructor: 'Lic. Andrea Morales',
        fechaInicio: '2026-04-07',
        fechaFin: '2026-04-11',
        horasTotales: 20,
        participantes: 15,
        estado: 'EN_CURSO',
        area: 'Ventas'
    },
    {
        id: 4,
        nombre: 'Liderazgo y Gestión de Equipos',
        descripcion: 'Coaching, comunicación asertiva y gestión del cambio',
        modalidad: 'PRESENCIAL',
        instructor: 'Dr. Fernando Ramos',
        fechaInicio: '2026-04-22',
        fechaFin: '2026-04-24',
        horasTotales: 24,
        participantes: 12,
        estado: 'PLANIFICADA',
        area: 'Gerencia'
    },
    {
        id: 5,
        nombre: 'Angular para Desarrollo Interno',
        descripcion: 'Signals, standalone components y arquitectura moderna',
        modalidad: 'VIRTUAL',
        instructor: 'Ing. Luis Paredes',
        fechaInicio: '2026-05-05',
        fechaFin: '2026-05-16',
        horasTotales: 40,
        participantes: 8,
        estado: 'PLANIFICADA',
        area: 'Sistemas'
    },
];

@Component({
    selector: 'app-training-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, DrawerComponent, DataTableComponent],
    templateUrl: './training-list.component.html'
})
export class TrainingListComponent {
    capacitaciones = signal<Capacitacion[]>(DEMO_CAPACITACIONES);
    filtroEstado = signal('');
    showModal = signal(false);

    readonly estadoOptions = [
        { value: 'PLANIFICADA', label: 'Planificada' },
        { value: 'EN_CURSO',    label: 'En Curso' },
        { value: 'COMPLETADA',  label: 'Completada' },
        { value: 'CANCELADA',   label: 'Cancelada' },
    ];

    readonly modalidadOptions: { value: Modalidad; label: string }[] = [
        { value: 'PRESENCIAL', label: 'Presencial' },
        { value: 'VIRTUAL',    label: 'Virtual' },
        { value: 'MIXTA',      label: 'Mixta' },
    ];

    columns: TableColumn<Capacitacion>[] = [
        { key: 'nombre', label: 'Curso',
          render: (row) => `${row.nombre}\n${row.descripcion}` },
        { key: 'modalidad', label: 'Modalidad', html: true,
          render: (row) => `<span class="${this.badgeModalidad(row.modalidad)}">${row.modalidad}</span>` },
        { key: 'instructor',   label: 'Instructor' },
        { key: 'area',         label: 'Área' },
        { key: 'fechaInicio',  label: 'Inicio',
          render: (row) => new Date(row.fechaInicio).toLocaleDateString('es-PE') },
        { key: 'fechaFin',     label: 'Fin',
          render: (row) => new Date(row.fechaFin).toLocaleDateString('es-PE') },
        { key: 'horasTotales', label: 'Horas',  align: 'center', render: (row) => `${row.horasTotales}h` },
        { key: 'participantes', label: 'Partic.', align: 'center', render: (row) => `${row.participantes}` },
        { key: 'estado', label: 'Estado', html: true,
          render: (row) => `<span class="${this.badgeCap(row.estado)}">${row.estado}</span>` },
    ];

    actions: TableAction<Capacitacion>[] = [
        {
            label: 'Iniciar', icon: '▶', class: 'btn-view',
            show: (row) => row.estado === 'PLANIFICADA',
            onClick: (_row) => {}
        },
        {
            label: 'Completar', icon: '✓', class: 'btn-view',
            show: (row) => row.estado === 'EN_CURSO',
            onClick: (_row) => {}
        }
    ];

    formNombre = '';
    formDescripcion = '';
    formModalidad: Modalidad = 'PRESENCIAL';
    formInstructor = '';
    formFechaInicio = '';
    formFechaFin = '';
    formHoras = 0;
    formArea = '';

    capacitacionesFiltradas = computed(() => {
        const f = this.filtroEstado();
        return f ? this.capacitaciones().filter(c => c.estado === f) : this.capacitaciones();
    });

    planificadas = computed(() =>
        this.capacitaciones().filter(c => c.estado === 'PLANIFICADA').length
    );

    enCurso = computed(() =>
        this.capacitaciones().filter(c => c.estado === 'EN_CURSO').length
    );

    completadas = computed(() =>
        this.capacitaciones().filter(c => c.estado === 'COMPLETADA').length
    );

    totalHoras = computed(() =>
        this.capacitaciones()
            .filter(c => c.estado === 'COMPLETADA')
            .reduce((acc, c) => acc + c.horasTotales, 0)
    );

    badgeCap(estado: EstadoCap): string {
        const map: Record<EstadoCap, string> = {
            PLANIFICADA: 'badge badge-warning',
            EN_CURSO: 'badge badge-accent',
            COMPLETADA: 'badge badge-success',
            CANCELADA: 'badge badge-neutral'
        };
        return map[estado] ?? 'badge';
    }

    badgeModalidad(m: Modalidad): string {
        const map: Record<Modalidad, string> = {
            PRESENCIAL: 'badge badge-neutral',
            VIRTUAL: 'badge badge-accent',
            MIXTA: 'badge badge-warning'
        };
        return map[m] ?? 'badge';
    }

    guardar(): void {
        if (!this.formNombre || !this.formFechaInicio) return;
        const nueva: Capacitacion = {
            id: Date.now(),
            nombre: this.formNombre,
            descripcion: this.formDescripcion || '',
            modalidad: this.formModalidad,
            instructor: this.formInstructor || 'Por confirmar',
            fechaInicio: this.formFechaInicio,
            fechaFin: this.formFechaFin || this.formFechaInicio,
            horasTotales: this.formHoras || 0,
            participantes: 0,
            estado: 'PLANIFICADA',
            area: this.formArea || 'General'
        };
        this.capacitaciones.update(list => [...list, nueva]);
        this.showModal.set(false);
        this.formNombre = '';
        this.formDescripcion = '';
        this.formModalidad = 'PRESENCIAL';
        this.formInstructor = '';
        this.formFechaInicio = '';
        this.formFechaFin = '';
        this.formHoras = 0;
        this.formArea = '';
    }
}
