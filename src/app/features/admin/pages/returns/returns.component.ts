import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
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
    imports: [FormsModule, DrawerComponent, DataTableComponent, DateInputComponent],
    templateUrl: './returns.component.html',
})
export class ReturnsComponent implements OnInit {
    private readonly http = inject(HttpClient);
    readonly parametros = inject(VentasParametrosService);

    devoluciones = signal<Devolucion[]>([]);
    pedidosEntregados = signal<OrderSummary[]>([]);
    showModal   = signal(false);
    guardando   = signal(false);
    editMode    = signal(false);
    selectedId  = signal<string | null>(null);
    filtroEstado = '';

    motivoOptions  = signal<SelectOption[]>([]);
    resolucionOptions = signal<SelectOption[]>([]);
    estadoOptions  = signal<SelectOption[]>([{ value: '', label: 'Todos los estados' }]);

    // Form state
    formPedidoId     = 0;
    formCliente      = '';
    formNumeroOrden  = '';
    formMotivo: MotivoDevolucion = 'DEFECTO';
    formResolucion: TipoResolucion = 'REEMBOLSO';
    formMonto        = 0;
    formObservaciones = '';
    formFecha        = new Date().toISOString().split('T')[0];

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
        if (!this.filtroEstado) return this.devoluciones();
        return this.devoluciones().filter(d => d.estado === this.filtroEstado);
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
        this.showModal.set(true);
    }

    abrirDetalle(row: Devolucion): void {
        this.formPedidoId     = row.pedidoId;
        this.formCliente      = row.clienteNombre;
        this.formNumeroOrden  = row.numeroOrden;
        this.formMotivo       = row.motivo;
        this.formResolucion   = row.tipoResolucion;
        this.formMonto        = row.monto;
        this.formObservaciones = row.observaciones ?? '';
        this.formFecha        = row.fechaSolicitud;
        this.editMode.set(true);
        this.selectedId.set(row.id);
        this.showModal.set(true);
    }

    guardar(): void {
        if (!this.formNumeroOrden.trim() || this.formMonto <= 0) return;

        const devolucion: Devolucion = {
            id: this.editMode() ? (this.selectedId() ?? crypto.randomUUID()) : crypto.randomUUID(),
            pedidoId:       this.formPedidoId,
            numeroOrden:    this.formNumeroOrden,
            clienteNombre:  this.formCliente || `Usuario #${this.formPedidoId}`,
            fechaSolicitud: this.formFecha,
            motivo:         this.formMotivo,
            tipoResolucion: this.formResolucion,
            monto:          this.formMonto,
            estado:         'SOLICITADA',
            observaciones:  this.formObservaciones || undefined,
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

    private resetForm(): void {
        this.formPedidoId      = 0;
        this.formCliente       = '';
        this.formNumeroOrden   = '';
        this.formMotivo        = 'DEFECTO';
        this.formResolucion    = 'REEMBOLSO';
        this.formMonto         = 0;
        this.formObservaciones = '';
        this.formFecha         = new Date().toISOString().split('T')[0];
    }
}
