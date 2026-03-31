import { Component, inject, signal, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DrawerComponent } from '../../../../../shared/components/drawer/drawer.component';
import { GuiaRemisionService } from '../../../services/guia-remision.service';
import { GuiaRemision, EstadoGuia, CreateGuiaRemisionDto, GuiaRemisionItemDto } from '../../../models/guia-remision.model';
import { AuthService } from '../../../../../core/auth/auth.service';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';

const MOTIVOS_TRASLADO: { codigo: string; descripcion: string }[] = [
    { codigo: '01', descripcion: '01 — Venta' },
    { codigo: '02', descripcion: '02 — Compra' },
    { codigo: '04', descripcion: '04 — Traslado entre establecimientos del mismo emisor' },
    { codigo: '08', descripcion: '08 — Importación' },
    { codigo: '09', descripcion: '09 — Exportación' },
    { codigo: '13', descripcion: '13 — Otros' },
    { codigo: '14', descripcion: '14 — Venta sujeta a confirmación del comprador' },
    { codigo: '18', descripcion: '18 — Traslado emisor itinerante CP' },
    { codigo: '19', descripcion: '19 — Traslado a zona primaria' },
];

interface ItemForm {
    productoNombre: string;
    sku: string;
    cantidad: number;
    unidad: string;
    descripcion: string;
}

interface GREForm {
    serie: string;
    numeroDocumento: string;
    fechaEmision: string;
    fechaInicioTraslado: string;
    // Punto de partida
    direccionOrigen: string;
    ubigeoOrigen: string;
    // Punto de llegada
    destinatarioRuc: string;
    destinatarioRazonSocial: string;
    destinatarioDireccion: string;
    ubigeoDestino: string;
    puntoLlegada: string;
    // Traslado
    motivoTraslado: string;
    descripcionTraslado: string;
    modalidadTraslado: '01' | '02';
    pesoBrutoTotal: number | null;
    // Transportista (solo si modalidad=01 público)
    transportistaRuc: string;
    transportistaRazonSocial: string;
    transportistaMtc: string;
    // Vehículo y conductor
    vehiculoPlaca: string;
    conductorDocumento: string;
    conductorNombre: string;
    conductorLicencia: string;
}

@Component({
    selector: 'app-guias-page',
    standalone: true,
    imports: [FormsModule, DrawerComponent, DataTableComponent, DateInputComponent, AlertComponent, PageHeaderComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './guias-page.component.html'
})
export class GuiasPageComponent implements OnInit {
    private readonly guiaService = inject(GuiaRemisionService);
    private readonly authService = inject(AuthService);

    readonly guias = signal<GuiaRemision[]>([]);
    readonly guiasFiltradas = signal<GuiaRemision[]>([]);
    readonly totalElements = signal(0);
    readonly showModal = signal(false);
    readonly loading = signal(false);
    readonly guardando = signal(false);
    readonly errorMsg = signal<string | null>(null);
    readonly itemForms = signal<ItemForm[]>([]);

    filtroEstado = '';
    readonly motivos = MOTIVOS_TRASLADO;

    // Pagination
    currentPage   = signal(0);
    pageSize      = signal(10);
    totalPages    = signal(0);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Guías de Remisión' }
    ];

    readonly estadoGuiaOptions: { value: EstadoGuia; label: string }[] = [
        { value: 'EMITIDA',   label: 'Emitida' },
        { value: 'ACEPTADA',  label: 'Aceptada' },
        { value: 'RECHAZADA', label: 'Rechazada' },
        { value: 'ANULADA',   label: 'Anulada' },
    ];

    columns: TableColumn<GuiaRemision>[] = [
        { key: 'serie', label: 'Serie/N°',
          render: (row) => `${row.serie}-${row.numero}` },
        { key: 'fechaEmision', label: 'Fecha Emisión',
          render: (row) => row.fechaEmision
            ? new Date(row.fechaEmision).toLocaleDateString('es-PE') : '-' },
        { key: 'motivoTraslado', label: 'Motivo',
          render: (row) => this.motivoLabel(row.motivoTraslado) },
        { key: 'destinatarioRazonSocial', label: 'Destinatario',
          render: (row) => row.destinatarioRazonSocial || '—' },
        { key: 'vehiculoPlaca', label: 'Placa/Conductor',
          render: (row) => row.vehiculoPlaca
            ? `${row.vehiculoPlaca}${row.conductorNombre ? ' — ' + row.conductorNombre : ''}`
            : '—' },
        { key: 'estado', label: 'Estado', html: true,
          render: (row) => `<span class="${this.badgeClass(row.estado)}">${row.estado}</span>` },
    ];

    actions: TableAction<GuiaRemision>[] = [
        {
            label: 'Aceptar', icon: '✓', class: 'btn-view',
            show: (row) => row.estado === 'EMITIDA',
            onClick: (row) => this.cambiarEstado(row.id, 'ACEPTADA')
        },
        {
            label: 'Anular', icon: '✕', class: 'btn-view',
            show: (row) => row.estado === 'EMITIDA',
            onClick: (row) => this.cambiarEstado(row.id, 'ANULADA')
        },
    ];

    form: GREForm = this.defaultForm();

    readonly formularioValido = computed(() =>
        !!this.form.serie &&
        !!this.form.numeroDocumento &&
        !!this.form.direccionOrigen &&
        !!this.form.motivoTraslado &&
        this.itemForms().length > 0
    );

    private get companyId(): string {
        return String(this.authService.currentUser()?.activeCompanyId ?? 1);
    }

    ngOnInit() { this.cargarGuias(); }

    cargarGuias() {
        this.loading.set(true);
        this.guiaService.getGuias(this.companyId).subscribe({
            next: (res) => {
                this.guias.set(res.content);
                this.guiasFiltradas.set(res.content);
                this.totalElements.set(res.totalElements);
                this.loading.set(false);
            },
            error: () => {
                this.guias.set([]);
                this.guiasFiltradas.set([]);
                this.loading.set(false);
            }
        });
    }

    aplicarFiltro() {
        if (!this.filtroEstado) {
            this.guiasFiltradas.set(this.guias());
        } else {
            this.guiasFiltradas.set(this.guias().filter(g => g.estado === this.filtroEstado));
        }
    }

    crearGuia() {
        if (!this.formularioValido()) {
            this.errorMsg.set('Complete los campos requeridos y agregue al menos un ítem.');
            return;
        }
        this.errorMsg.set(null);
        this.guardando.set(true);

        const items: GuiaRemisionItemDto[] = this.itemForms().map(it => ({
            productoNombre: it.productoNombre,
            sku: it.sku || undefined,
            cantidad: it.cantidad,
            unidad: it.unidad || 'NIU',
            descripcion: it.descripcion || undefined
        }));

        const dto: CreateGuiaRemisionDto = {
            serie: this.form.serie,
            numeroDocumento: this.form.numeroDocumento,
            fechaEmision: this.form.fechaEmision || undefined,
            fechaInicioTraslado: this.form.fechaInicioTraslado || undefined,
            almacenOrigenId: '00000000-0000-0000-0000-000000000001',
            direccionOrigen: this.form.direccionOrigen,
            ubigeoOrigen: this.form.ubigeoOrigen || undefined,
            destinatarioRuc: this.form.destinatarioRuc || undefined,
            destinatarioRazonSocial: this.form.destinatarioRazonSocial || undefined,
            destinatarioDireccion: this.form.destinatarioDireccion || undefined,
            ubigeoDestino: this.form.ubigeoDestino || undefined,
            puntoLlegada: this.form.puntoLlegada || undefined,
            motivoTraslado: this.form.motivoTraslado,
            descripcionTraslado: this.form.descripcionTraslado || undefined,
            modalidadTraslado: this.form.modalidadTraslado,
            pesoBrutoTotal: this.form.pesoBrutoTotal ?? undefined,
            transportistaRuc: this.form.transportistaRuc || undefined,
            transportistaRazonSocial: this.form.transportistaRazonSocial || undefined,
            transportistaMtc: this.form.transportistaMtc || undefined,
            vehiculoPlaca: this.form.vehiculoPlaca || undefined,
            conductorDocumento: this.form.conductorDocumento || undefined,
            conductorNombre: this.form.conductorNombre || undefined,
            conductorLicencia: this.form.conductorLicencia || undefined,
            items
        };

        this.guiaService.createGuia(dto, this.companyId, this.companyId).subscribe({
            next: () => {
                this.cerrarModal();
                this.cargarGuias();
                this.guardando.set(false);
            },
            error: (err) => {
                this.errorMsg.set('Error al crear la guía. Verifique los datos e intente nuevamente.');
                this.guardando.set(false);
            }
        });
    }

    cambiarEstado(id: string, estado: string) {
        this.guiaService.actualizarEstado(id, estado, this.companyId).subscribe({
            next: () => this.cargarGuias()
        });
    }

    agregarItem() {
        this.itemForms.update(items => [
            ...items,
            { productoNombre: '', sku: '', cantidad: 1, unidad: 'NIU', descripcion: '' }
        ]);
    }

    eliminarItem(index: number) {
        this.itemForms.update(items => items.filter((_, i) => i !== index));
    }

    cerrarModal() {
        this.showModal.set(false);
        this.form = this.defaultForm();
        this.itemForms.set([]);
        this.errorMsg.set(null);
    }

    motivoLabel(codigo: string): string {
        return MOTIVOS_TRASLADO.find(m => m.codigo === codigo)?.descripcion ?? codigo ?? '—';
    }

    badgeClass(estado: EstadoGuia): string {
        const map: Record<EstadoGuia, string> = {
            EMITIDA: 'badge badge-accent',
            ACEPTADA: 'badge badge-success',
            RECHAZADA: 'badge badge-error',
            ANULADA: 'badge badge-neutral'
        };
        return map[estado] ?? 'badge';
    }

    private defaultForm(): GREForm {
        const hoy = new Date().toISOString().split('T')[0];
        return {
            serie: 'T001',
            numeroDocumento: '',
            fechaEmision: hoy,
            fechaInicioTraslado: hoy,
            direccionOrigen: '',
            ubigeoOrigen: '',
            destinatarioRuc: '',
            destinatarioRazonSocial: '',
            destinatarioDireccion: '',
            ubigeoDestino: '',
            puntoLlegada: '',
            motivoTraslado: '',
            descripcionTraslado: '',
            modalidadTraslado: '02',
            pesoBrutoTotal: null,
            transportistaRuc: '',
            transportistaRazonSocial: '',
            transportistaMtc: '',
            vehiculoPlaca: '',
            conductorDocumento: '',
            conductorNombre: '',
            conductorLicencia: ''
        };
    }
}
