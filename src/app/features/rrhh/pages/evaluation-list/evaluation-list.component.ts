import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DrawerComponent } from '../../../../shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';

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
    {
        id: 1,
        empleadoNombre: 'Ana García López',
        evaluadorNombre: 'Roberto Díaz',
        periodo: '2026-Q1',
        competencias: 'Liderazgo, Comunicación, Trabajo en equipo',
        puntaje: 4,
        estado: 'COMPLETADA',
        fechaProgramada: '2026-03-15'
    },
    {
        id: 2,
        empleadoNombre: 'Carlos Mendoza Ríos',
        evaluadorNombre: 'María Torres',
        periodo: '2026-Q1',
        competencias: 'Productividad, Calidad, Iniciativa',
        puntaje: 5,
        estado: 'COMPLETADA',
        fechaProgramada: '2026-03-18'
    },
    {
        id: 3,
        empleadoNombre: 'Luis Vargas Huamán',
        evaluadorNombre: 'Roberto Díaz',
        periodo: '2026-Q2',
        competencias: 'Liderazgo, Gestión de proyectos',
        estado: 'EN_PROCESO',
        fechaProgramada: '2026-04-10'
    },
    {
        id: 4,
        empleadoNombre: 'Patricia Soto Flores',
        evaluadorNombre: 'José Ramírez',
        periodo: '2026-Q2',
        competencias: 'Atención al cliente, Comunicación',
        estado: 'PENDIENTE',
        fechaProgramada: '2026-04-20'
    },
    {
        id: 5,
        empleadoNombre: 'Miguel Herrera Castro',
        evaluadorNombre: 'María Torres',
        periodo: '2026-Q2',
        competencias: 'Productividad, Calidad, Innovación',
        estado: 'PENDIENTE',
        fechaProgramada: '2026-04-25'
    },
];

@Component({
    selector: 'app-evaluation-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, DrawerComponent, DataTableComponent],
    templateUrl: './evaluation-list.component.html'
})
export class EvaluationListComponent {
    evaluaciones = signal<Evaluacion[]>(DEMO_EVALUACIONES);
    filtroEstado = signal('');
    showModal = signal(false);

    readonly estadoOptions = [
        { value: 'PENDIENTE',   label: 'Pendiente' },
        { value: 'EN_PROCESO',  label: 'En Proceso' },
        { value: 'COMPLETADA',  label: 'Completada' },
        { value: 'CANCELADA',   label: 'Cancelada' },
    ];

    columns: TableColumn<Evaluacion>[] = [
        { key: 'empleadoNombre',  label: 'Empleado' },
        { key: 'evaluadorNombre', label: 'Evaluador' },
        { key: 'periodo',         label: 'Período' },
        { key: 'competencias',    label: 'Competencias' },
        { key: 'fechaProgramada', label: 'Programada',
          render: (row) => new Date(row.fechaProgramada).toLocaleDateString('es-PE') },
        { key: 'puntaje', label: 'Puntaje', align: 'center', html: true,
          render: (row) => row.puntaje
            ? `<span class="${this.badgePuntaje(row.puntaje)}">${row.puntaje}/5</span>`
            : '<span style="color:var(--color-text-muted)">—</span>' },
        { key: 'estado', label: 'Estado', html: true,
          render: (row) => `<span class="${this.badgeEval(row.estado)}">${row.estado}</span>` },
    ];

    actions: TableAction<Evaluacion>[] = [
        {
            label: 'Completar', icon: '✓', class: 'btn-view',
            show: (row) => row.estado === 'PENDIENTE' || row.estado === 'EN_PROCESO',
            onClick: (_row) => {}
        }
    ];

    formNombre = '';
    formEvaluador = '';
    formPeriodo = '';
    formCompetencias = '';
    formFecha = '';

    evaluacionesFiltradas = computed(() => {
        const f = this.filtroEstado();
        return f ? this.evaluaciones().filter(e => e.estado === f) : this.evaluaciones();
    });

    pendientes = computed(() =>
        this.evaluaciones().filter(e => e.estado === 'PENDIENTE' || e.estado === 'EN_PROCESO').length
    );

    completadas = computed(() =>
        this.evaluaciones().filter(e => e.estado === 'COMPLETADA').length
    );

    badgeEval(estado: EstadoEval): string {
        const map: Record<EstadoEval, string> = {
            PENDIENTE: 'badge badge-warning',
            EN_PROCESO: 'badge badge-accent',
            COMPLETADA: 'badge badge-success',
            CANCELADA: 'badge badge-neutral'
        };
        return map[estado] ?? 'badge';
    }

    badgePuntaje(p: number): string {
        if (p >= 4) return 'badge badge-success';
        if (p >= 3) return 'badge badge-warning';
        return 'badge badge-error';
    }

    guardar(): void {
        if (!this.formNombre || !this.formPeriodo) return;
        const nueva: Evaluacion = {
            id: Date.now(),
            empleadoNombre: this.formNombre,
            evaluadorNombre: this.formEvaluador || 'Sin asignar',
            periodo: this.formPeriodo,
            competencias: this.formCompetencias || 'General',
            estado: 'PENDIENTE',
            fechaProgramada: this.formFecha || new Date().toISOString().split('T')[0]
        };
        this.evaluaciones.update(list => [...list, nueva]);
        this.showModal.set(false);
        this.formNombre = '';
        this.formEvaluador = '';
        this.formPeriodo = '';
        this.formCompetencias = '';
        this.formFecha = '';
    }
}
