import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { AdminFormSectionComponent } from '@shared/ui/forms/admin-form-section/admin-form-section.component';
import { AdminFormLayoutComponent } from '@shared/ui/forms/admin-form-layout/admin-form-layout.component';
import { VentasParametrosService, SelectOption } from '../../services/ventas-parametros.service';

type MotivoDevolucion = 'DEFECTO' | 'CAMBIO' | 'ERROR_PEDIDO' | 'NO_LLEGÓ' | 'OTRO';
type TipoResolucion   = 'REEMBOLSO' | 'CAMBIO_PRODUCTO' | 'CREDITO_TIENDA';
type EstadoDevolucion = 'SOLICITADA' | 'EN_REVISION' | 'APROBADA' | 'RECHAZADA';

interface Devolucion {
    id: string;
    pedidoId: number;
    numeroOrden: string;
    clienteNombre: string;
    fechaSolicitud: string;
    motivo: MotivoDevolucion;
    tipoResolucion: TipoResolucion;
    monto: number;
    estado: EstadoDevolucion;
    observaciones?: string;
}

interface OrderSummary { id: number; usuarioId: number; estado: string; total: number; }
interface PageResponse<T> { content: T[]; }

@Component({
    selector: 'app-returns',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DrawerComponent,
        DataTableComponent,
        DateInputComponent,
        FormFieldComponent,
        AdminFormSectionComponent,
        AdminFormLayoutComponent,
    ],
    templateUrl: './returns.component.html',
})
export class ReturnsComponent implements OnInit {
    private readonly http      = inject(HttpClient);
    private readonly fb        = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);
    readonly parametros        = inject(VentasParametrosService);

    devoluciones      = signal<Devolucion[]>([]);
    pedidosEntregados = signal<OrderSummary[]>([]);
    showModal         = signal(false);
    guardando         = signal(false);
    editMode          = signal(false);
    selectedId        = signal<string | null>(null);
    submitError       = signal('');

    motivoOptions      = signal<SelectOption[]>([]);
    resolucionOptions  = signal<SelectOption[]>([]);
    estadoOptions      = signal<SelectOption[]>([{ value: '', label: 'Todos los estados' }]);
    filtroEstadoSignal = signal('');

    // Formulario de filtro
    filterForm: FormGroup = this.fb.group({
        filtroEstado: [''],
    });

    // Formulario de devolución
    returnForm: FormGroup = this.fb.group({
        numeroOrden:   ['', Validators.required],
        clienteNombre: [''],
        motivo:        ['DEFECTO' as MotivoDevolucion, Validators.required],
        tipoResolucion:['REEMBOLSO' as TipoResolucion],
        monto:         [0, [Validators.required, Validators.min(0.01)]],
        fechaSolicitud:[new Date().toISOString().split('T')[0], Validators.required],
        observaciones: [''],
    });

    columns: TableColumn<Devolucion>[] = [
        { key: 'fechaSolicitud', label: 'Fecha',
          render: (row) => new Date(row.fechaSolicitud).toLocaleDateString('es-PE') },
        { key: 'numeroOrden',   label: 'Pedido' },
        { key: 'clienteNombre', label: 'Cliente' },
        { key: 'motivo',        label: 'Motivo',
          render: (row) => this.motivoOptions().find(m => m.value === row.motivo)?.label ?? row.motivo },
        { key: 'tipoResolucion', label: 'Resolución',
          render: (row) => this.resolucionOptions().find(r => r.value === row.tipoResolucion)?.label ?? row.tipoResolucion },
        { key: 'monto', label: 'Monto', align: 'right',
          render: (row) => `S/ ${(row.monto ?? 0).toFixed(2)}` },
        { key: 'estado', label: 'Estado', html: true,
          render: (row) => `<span class="badge ${this.parametros.getBadgeEstadoDevolucion(row.estado)}">${row.estado.replace('_', ' ')}</span>` },
    ];

    actions: TableAction<Devolucion>[] = [
        { label: 'Revisar', icon: '👁', class: 'btn-view',
          onClick: (row) => this.abrirDetalle(row) },
        { label: 'Aprobar', icon: '✓', class: 'btn-view',
          show: (row) => row.estado === 'EN_REVISION',
          onClick: (row) => this.cambiarEstado(row.id, 'APROBADA') },
        { label: 'Rechazar', icon: '✕', class: 'btn-view',
          show: (row) => row.estado === 'EN_REVISION',
          onClick: (row) => this.cambiarEstado(row.id, 'RECHAZADA') },
    ];

    devolucionesFiltradas = computed(() => {
        const estado = this.filtroEstadoSignal();
        if (!estado) return this.devoluciones();
        return this.devoluciones().filter(d => d.estado === estado);
    });

    totalDevoluciones  = computed(() => this.devoluciones().length);
    devPendientes      = computed(() => this.devoluciones().filter(d => d.estado === 'SOLICITADA').length);
    devAprobadas       = computed(() => this.devoluciones().filter(d => d.estado === 'APROBADA').length);
    montoReembolsado   = computed(() =>
        this.devoluciones()
            .filter(d => d.estado === 'APROBADA' && d.tipoResolucion === 'REEMBOLSO')
            .reduce((s, d) => s + d.monto, 0)
    );

    ngOnInit(): void {
        this.filterForm.get('filtroEstado')!.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((v: string) => this.filtroEstadoSignal.set(v ?? ''));

        this.cargarPedidos();
        this.parametros.getMotivosDevolucion().subscribe(opts => this.motivoOptions.set(opts));
        this.parametros.getTiposResolucion().subscribe(opts => this.resolucionOptions.set(opts));
        this.parametros.getEstadosDevolucion().subscribe(opts =>
            this.estadoOptions.set([{ value: '', label: 'Todos los estados' }, ...opts])
        );
    }

    cargarPedidos(): void {
        const url = `${environment.apiUrls.sales}/api/pedidos?page=0&size=50&sort=fechaPedido,desc`;
        this.http.get<PageResponse<OrderSummary>>(url).subscribe({
            next: (res) => this.pedidosEntregados.set(
                (res.content ?? []).filter(p => p.estado === 'ENTREGADO')
            ),
            error: () => this.pedidosEntregados.set([])
        });
    }

    abrirNueva(): void {
        this.resetForm();
        this.editMode.set(false);
        this.selectedId.set(null);
        this.submitError.set('');
        this.showModal.set(true);
    }

    abrirDetalle(row: Devolucion): void {
        this.returnForm.patchValue({
            numeroOrden:    row.numeroOrden,
            clienteNombre:  row.clienteNombre,
            motivo:         row.motivo,
            tipoResolucion: row.tipoResolucion,
            monto:          row.monto,
            fechaSolicitud: row.fechaSolicitud,
            observaciones:  row.observaciones ?? '',
        });
        this.returnForm.markAsPristine();
        this.editMode.set(true);
        this.selectedId.set(row.id);
        this.submitError.set('');
        this.showModal.set(true);
    }

    guardar(): void {
        if (this.returnForm.invalid) {
            this.returnForm.markAllAsTouched();
            return;
        }

        const v = this.returnForm.getRawValue() as {
            numeroOrden: string;
            clienteNombre: string;
            motivo: MotivoDevolucion;
            tipoResolucion: TipoResolucion;
            monto: number;
            fechaSolicitud: string;
            observaciones: string;
        };

        const devolucion: Devolucion = {
            id:             this.editMode() ? (this.selectedId() ?? crypto.randomUUID()) : crypto.randomUUID(),
            pedidoId:       0,
            numeroOrden:    v.numeroOrden,
            clienteNombre:  v.clienteNombre || `Pedido ${v.numeroOrden}`,
            fechaSolicitud: v.fechaSolicitud,
            motivo:         v.motivo,
            tipoResolucion: v.tipoResolucion,
            monto:          v.monto,
            estado:         'SOLICITADA',
            observaciones:  v.observaciones || undefined,
        };

        if (this.editMode()) {
            this.devoluciones.update(list =>
                list.map(d => d.id === devolucion.id ? { ...d, ...devolucion, estado: d.estado } : d)
            );
        } else {
            this.devoluciones.update(list => [devolucion, ...list]);
        }

        this.cerrarModal();
    }

    cambiarEstado(id: string, estado: EstadoDevolucion): void {
        this.devoluciones.update(list =>
            list.map(d => d.id === id ? { ...d, estado } : d)
        );
    }

    cerrarModal(): void {
        this.showModal.set(false);
        this.resetForm();
    }

    /** Helper canónico de errores para returnForm */
    err(field: string): string {
        const c = this.returnForm.get(field);
        if (!c || c.pristine || c.valid) return '';
        if (c.hasError('required')) return 'Campo requerido';
        if (c.hasError('min')) return `Valor mínimo: ${c.getError('min').min}`;
        return 'Campo inválido';
    }

    private resetForm(): void {
        this.returnForm.reset({
            numeroOrden:    '',
            clienteNombre:  '',
            motivo:         'DEFECTO',
            tipoResolucion: 'REEMBOLSO',
            monto:          0,
            fechaSolicitud: new Date().toISOString().split('T')[0],
            observaciones:  '',
        });
        this.returnForm.markAsPristine();
        this.returnForm.markAsUntouched();
    }
}
