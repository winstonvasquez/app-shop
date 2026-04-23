import { Component, inject, signal, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonComponent } from '@shared/components';
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

@Component({
    selector: 'app-guias-page',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonComponent, DrawerComponent, DataTableComponent, DateInputComponent, AlertComponent, PageHeaderComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './guias-page.component.html'
})
export class GuiasPageComponent implements OnInit {
    private readonly guiaService = inject(GuiaRemisionService);
    private readonly authService = inject(AuthService);
    private readonly fb          = inject(FormBuilder);

    readonly guias           = signal<GuiaRemision[]>([]);
    readonly guiasFiltradas  = signal<GuiaRemision[]>([]);
    readonly totalElements   = signal(0);
    readonly showModal       = signal(false);
    readonly loading         = signal(false);
    readonly guardando       = signal(false);
    readonly errorMsg        = signal<string | null>(null);
    readonly itemForms       = signal<ItemForm[]>([]);

    readonly motivos = MOTIVOS_TRASLADO;

    // Pagination
    currentPage = signal(0);
    pageSize    = signal(10);
    totalPages  = signal(0);

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

    // Filter — reactive (1 campo compacto)
    filterForm = this.fb.group({
        estado: ['']
    });

    // Form GRE — reactive
    private readonly hoy = new Date().toISOString().split('T')[0];

    greForm = this.fb.group({
        // Identificación
        serie:              ['T001', [Validators.required]],
        numeroDocumento:    ['',     [Validators.required]],
        fechaEmision:       [this.hoy],
        fechaInicioTraslado:[this.hoy],
        // Punto de partida
        direccionOrigen:    ['',     [Validators.required]],
        ubigeoOrigen:       [''],
        // Destinatario
        destinatarioRuc:         [''],
        destinatarioRazonSocial: [''],
        destinatarioDireccion:   [''],
        ubigeoDestino:           [''],
        puntoLlegada:            [''],
        // Traslado
        motivoTraslado:      ['',   [Validators.required]],
        descripcionTraslado: [''],
        modalidadTraslado:   ['02' as '01' | '02'],
        pesoBrutoTotal:      [null as number | null],
        // Transportista
        transportistaRuc:         [''],
        transportistaRazonSocial: [''],
        transportistaMtc:         [''],
        // Vehículo y conductor
        vehiculoPlaca:     [''],
        conductorDocumento:[''],
        conductorNombre:   [''],
        conductorLicencia: ['']
    });

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

    readonly formularioValido = computed(() => {
        const v = this.greForm.value;
        return !!v.serie &&
            !!v.numeroDocumento &&
            !!v.direccionOrigen &&
            !!v.motivoTraslado &&
            this.itemForms().length > 0;
    });

    /** Shortcut para saber si la modalidad es pública */
    get esTransportePublico(): boolean {
        return this.greForm.value.modalidadTraslado === '01';
    }

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
        const estado = this.filterForm.value.estado ?? '';
        if (!estado) {
            this.guiasFiltradas.set(this.guias());
        } else {
            this.guiasFiltradas.set(this.guias().filter(g => g.estado === estado));
        }
    }

    crearGuia() {
        if (!this.formularioValido()) {
            this.errorMsg.set('Complete los campos requeridos y agregue al menos un ítem.');
            return;
        }
        this.errorMsg.set(null);
        this.guardando.set(true);

        const f = this.greForm.value;

        const items: GuiaRemisionItemDto[] = this.itemForms().map(it => ({
            productoNombre: it.productoNombre,
            sku:            it.sku || undefined,
            cantidad:       it.cantidad,
            unidad:         it.unidad || 'NIU',
            descripcion:    it.descripcion || undefined
        }));

        const dto: CreateGuiaRemisionDto = {
            serie:              f.serie ?? '',
            numeroDocumento:    f.numeroDocumento ?? '',
            fechaEmision:       f.fechaEmision       || undefined,
            fechaInicioTraslado:f.fechaInicioTraslado || undefined,
            almacenOrigenId:    '00000000-0000-0000-0000-000000000001',
            direccionOrigen:    f.direccionOrigen ?? '',
            ubigeoOrigen:       f.ubigeoOrigen       || undefined,
            destinatarioRuc:    f.destinatarioRuc    || undefined,
            destinatarioRazonSocial: f.destinatarioRazonSocial || undefined,
            destinatarioDireccion:   f.destinatarioDireccion   || undefined,
            ubigeoDestino:      f.ubigeoDestino      || undefined,
            puntoLlegada:       f.puntoLlegada        || undefined,
            motivoTraslado:     f.motivoTraslado      ?? '',
            descripcionTraslado:f.descripcionTraslado || undefined,
            modalidadTraslado:  (f.modalidadTraslado ?? '02') as '01' | '02',
            pesoBrutoTotal:     f.pesoBrutoTotal      ?? undefined,
            transportistaRuc:   f.transportistaRuc    || undefined,
            transportistaRazonSocial: f.transportistaRazonSocial || undefined,
            transportistaMtc:   f.transportistaMtc    || undefined,
            vehiculoPlaca:      f.vehiculoPlaca        || undefined,
            conductorDocumento: f.conductorDocumento   || undefined,
            conductorNombre:    f.conductorNombre      || undefined,
            conductorLicencia:  f.conductorLicencia    || undefined,
            items
        };

        this.guiaService.createGuia(dto, this.companyId, this.companyId).subscribe({
            next: () => {
                this.cerrarModal();
                this.cargarGuias();
                this.guardando.set(false);
            },
            error: () => {
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

    // ── Items ──────────────────────────────────────────
    agregarItem() {
        this.itemForms.update(items => [
            ...items,
            { productoNombre: '', sku: '', cantidad: 1, unidad: 'NIU', descripcion: '' }
        ]);
    }

    eliminarItem(index: number) {
        this.itemForms.update(items => items.filter((_, i) => i !== index));
    }

    updateItemField(index: number, field: keyof ItemForm, value: string | number) {
        this.itemForms.update(items =>
            items.map((item, i) => i === index ? { ...item, [field]: value } : item)
        );
    }

    cerrarModal() {
        this.showModal.set(false);
        this.greForm.reset({
            serie: 'T001',
            modalidadTraslado: '02',
            fechaEmision: this.hoy,
            fechaInicioTraslado: this.hoy
        });
        this.itemForms.set([]);
        this.errorMsg.set(null);
    }

    motivoLabel(codigo: string): string {
        return MOTIVOS_TRASLADO.find(m => m.codigo === codigo)?.descripcion ?? codigo ?? '—';
    }

    badgeClass(estado: EstadoGuia): string {
        const map: Record<EstadoGuia, string> = {
            EMITIDA:   'badge badge-accent',
            ACEPTADA:  'badge badge-success',
            RECHAZADA: 'badge badge-error',
            ANULADA:   'badge badge-neutral'
        };
        return map[estado] ?? 'badge';
    }
}
