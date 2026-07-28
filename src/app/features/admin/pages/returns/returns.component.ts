import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { bloquearEnEdicion } from '@shared/utils/form-lock';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { DateInputComponent } from '@shared/ui/forms/date-input/date-input.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { AdminFormSectionComponent } from '@shared/ui/forms/admin-form-section/admin-form-section.component';
import { AdminFormLayoutComponent } from '@shared/ui/forms/admin-form-layout/admin-form-layout.component';
import { ButtonComponent } from '@shared/components';
import { AuthService } from '@core/auth/auth.service';
import { VentasParametrosService, SelectOption } from '../../services/ventas-parametros.service';
import { CURRENCY_DISPLAY } from '@shared/constants/sunat.constants';
import { ServerSearchSelectComponent } from '@shared/components';
import { OrderService } from '@core/services/order.service';
import { pedidoSelectSource } from '../../components/select-sources';

type MotivoDevolucion = 'DEFECTO' | 'CAMBIO' | 'ERROR_PEDIDO' | 'NO_LLEGÓ' | 'OTRO';
type TipoResolucion   = 'REEMBOLSO' | 'CAMBIO_PRODUCTO' | 'CREDITO_TIENDA';
type EstadoDevolucion = 'SOLICITADA' | 'EN_REVISION' | 'APROBADA' | 'RECHAZADA';

interface Devolucion {
    id: string;
    pedidoId: number | null;
    numeroOrden: string;
    clienteNombre: string;
    fechaSolicitud: string;
    motivo: MotivoDevolucion;
    tipoResolucion: TipoResolucion;
    monto: number;
    estado: EstadoDevolucion;
    observaciones?: string;
}

interface DevolucionStats {
    total: number;
    pendientes: number;
    aprobadas: number;
    montoReembolsado: number;
}

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
        ButtonComponent,
        ServerSearchSelectComponent,
    ],
    templateUrl: './returns.component.html',
})
export class ReturnsComponent implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly fb   = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    private readonly orderService = inject(OrderService);
    readonly parametros   = inject(VentasParametrosService);

    readonly pedidoSource = pedidoSelectSource(this.orderService);

    private readonly baseUrl = `${environment.apiUrls.sales}/api/devoluciones`;

    /** Tenant actual (claim del JWT) — requerido por @RequiresTenantAccess en el backend. */
    private companyId(): string {
        return String(this.auth.currentUser()?.activeCompanyId ?? '');
    }

    devoluciones = signal<Devolucion[]>([]);
    stats        = signal<DevolucionStats>({ total: 0, pendientes: 0, aprobadas: 0, montoReembolsado: 0 });
    loading      = signal(false);
    showModal    = signal(false);
    guardando    = signal(false);
    editMode     = signal(false);
    selectedId   = signal<string | null>(null);
    submitError  = signal('');

    motivoOptions     = signal<SelectOption[]>([]);
    resolucionOptions = signal<SelectOption[]>([]);

    // Filtros / búsqueda (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery  = signal('');
    filtroEstado = signal('');
    filtroMotivo = signal('');
    filtroTipoResolucion = signal('');
    filtroFechaSolicitudDesde = signal<string | undefined>(undefined);
    filtroFechaSolicitudHasta = signal<string | undefined>(undefined);

    // Paginación server-side
    currentPage   = signal(0);
    pageSize      = signal(20);
    totalElements = signal(0);
    totalPages    = signal(0);

    // Filtros select del toolbar — opciones dinámicas desde parámetros (BD, grupos de ventas
    // MOTIVO_DEVOLUCION / TIPO_RESOLUCION; no viven en erp_parameters, ver catalogos-disponibles.md).
    filters: FilterConfig[] = [
        { field: 'estado', label: 'Estado', options: this.parametros.getEstadosDevolucion() },
        { field: 'motivo', label: 'Motivo', options: this.parametros.getMotivosDevolucion() },
        { field: 'tipoResolucion', label: 'Resolución', options: this.parametros.getTiposResolucion() }
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaSolicitud', label: 'Fecha de solicitud' }
    ];

    // Formulario de devolución
    returnForm: FormGroup = this.fb.group({
        pedidoId:      [null as number | null, Validators.required],
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
          render: (row) => new Date(row.fechaSolicitud + 'T00:00:00').toLocaleDateString('es-PE') },
        { key: 'numeroOrden',   label: 'Pedido' },
        { key: 'clienteNombre', label: 'Cliente' },
        { key: 'motivo',        label: 'Motivo',
          render: (row) => this.motivoOptions().find(m => m.value === row.motivo)?.label ?? row.motivo },
        { key: 'tipoResolucion', label: 'Resolución',
          render: (row) => this.resolucionOptions().find(r => r.value === row.tipoResolucion)?.label ?? row.tipoResolucion },
        { key: 'monto', label: 'Monto', align: 'right',
          render: (row) => `${CURRENCY_DISPLAY.SYMBOL_PEN} ${(row.monto ?? 0).toFixed(2)}` },
        { key: 'estado', label: 'Estado', html: true,
          render: (row) => `<span class="badge ${this.parametros.getBadgeEstadoDevolucion(row.estado)}">${row.estado.replace('_', ' ')}</span>` },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta los filtros actuales companyId + search + estado). Ver /sales/api/devoluciones/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${this.baseUrl}/export`,
        filename: 'devoluciones',
        params: () => ({
            companyId: this.companyId(),
            search: this.searchQuery(),
            estado: this.filtroEstado(),
            motivo: this.filtroMotivo(),
            tipoResolucion: this.filtroTipoResolucion(),
            fechaSolicitudDesde: this.filtroFechaSolicitudDesde(),
            fechaSolicitudHasta: this.filtroFechaSolicitudHasta(),
        }),
    };

    actions: TableAction<Devolucion>[] = [
        { label: 'Revisar', icon: '👁', class: 'btn-view',
          onClick: (row) => this.abrirDetalle(row) },
        { label: 'Pasar a revisión', icon: '✏️', class: 'btn-view',
          show: (row) => row.estado === 'SOLICITADA',
          onClick: (row) => this.cambiarEstado(row.id, 'EN_REVISION') },
        { label: 'Aprobar', icon: '✓', class: 'btn-view',
          show: (row) => row.estado === 'EN_REVISION',
          onClick: (row) => this.cambiarEstado(row.id, 'APROBADA') },
        { label: 'Rechazar', icon: '✕', class: 'btn-view',
          show: (row) => row.estado === 'EN_REVISION',
          onClick: (row) => this.cambiarEstado(row.id, 'RECHAZADA') },
    ];

    ngOnInit(): void {
        this.parametros.getMotivosDevolucion().subscribe(opts => this.motivoOptions.set(opts));
        this.parametros.getTiposResolucion().subscribe(opts => this.resolucionOptions.set(opts));
        this.loadPage();
        this.loadStats();

        // F4.2: numeroOrden se deriva automáticamente del pedido real seleccionado
        // (antes era texto libre desconectado del pedidoId, que siempre se enviaba null).
        this.returnForm.get('pedidoId')!.valueChanges.subscribe((id: number | null) => {
            this.returnForm.get('numeroOrden')!.setValue(id != null ? `#${id}` : '');
        });
    }

    /** Carga la página actual server-side (search + estado + 20/pág). */
    private loadPage(): void {
        this.loading.set(true);
        const params: Record<string, string> = {
            companyId: this.companyId(),
            page: String(this.currentPage()),
            size: String(this.pageSize()),
        };
        if (this.searchQuery()) params['search'] = this.searchQuery();
        if (this.filtroEstado()) params['estado'] = this.filtroEstado();
        if (this.filtroMotivo()) params['motivo'] = this.filtroMotivo();
        if (this.filtroTipoResolucion()) params['tipoResolucion'] = this.filtroTipoResolucion();
        if (this.filtroFechaSolicitudDesde()) params['fechaSolicitudDesde'] = this.filtroFechaSolicitudDesde()!;
        if (this.filtroFechaSolicitudHasta()) params['fechaSolicitudHasta'] = this.filtroFechaSolicitudHasta()!;

        this.http.get<PageResponse<Devolucion>>(`${this.baseUrl}/paged`, { params }).subscribe({
            next: (res) => {
                this.devoluciones.set(res.content ?? []);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: () => {
                this.devoluciones.set([]);
                this.loading.set(false);
            }
        });
    }

    private loadStats(): void {
        this.http.get<DevolucionStats>(`${this.baseUrl}/stats`, { params: { companyId: this.companyId() } }).subscribe({
            next: (s) => this.stats.set(s),
            error: () => { /* cards quedan en 0 */ }
        });
    }

    // ── Toolbar handlers ──────────────────────────────────────────────────────
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadPage();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':         this.filtroEstado.set(valor); break;
            case 'motivo':         this.filtroMotivo.set(valor); break;
            case 'tipoResolucion': this.filtroTipoResolucion.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadPage();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'fechaSolicitud') return;
        this.filtroFechaSolicitudDesde.set(event.from ?? undefined);
        this.filtroFechaSolicitudHasta.set(event.to ?? undefined);
        this.currentPage.set(0);
        this.loadPage();
    }

    /** "Limpiar filtros": resetea TODOS los signals y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filtroEstado.set('');
        this.filtroMotivo.set('');
        this.filtroTipoResolucion.set('');
        this.filtroFechaSolicitudDesde.set(undefined);
        this.filtroFechaSolicitudHasta.set(undefined);
        this.currentPage.set(0);
        this.loadPage();
    }

    onPageChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadPage();
    }

    // ── Drawer / CRUD ─────────────────────────────────────────────────────────
    abrirNueva(): void {
        this.resetForm();
        bloquearEnEdicion(this.returnForm, ['pedidoId', 'numeroOrden', 'fechaSolicitud'], false);
        this.editMode.set(false);
        this.selectedId.set(null);
        this.submitError.set('');
        this.showModal.set(true);
    }

    abrirDetalle(row: Devolucion): void {
        this.returnForm.patchValue({
            pedidoId:       row.pedidoId,
            numeroOrden:    row.numeroOrden,
            clienteNombre:  row.clienteNombre,
            motivo:         row.motivo,
            tipoResolucion: row.tipoResolucion,
            monto:          row.monto,
            fechaSolicitud: row.fechaSolicitud,
            observaciones:  row.observaciones ?? '',
        });
        this.returnForm.markAsPristine();
        // El pedido de origen y su número identifican la devolución: reapuntarla a
        // otro pedido descuadraría el stock y la nota de crédito ya emitida.
        bloquearEnEdicion(this.returnForm, ['pedidoId', 'numeroOrden', 'fechaSolicitud'], true);
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
        this.guardando.set(true);
        this.submitError.set('');
        const v = this.returnForm.getRawValue();
        const body = {
            pedidoId:       v.pedidoId,
            numeroOrden:    v.numeroOrden,
            clienteNombre:  v.clienteNombre,
            fechaSolicitud: v.fechaSolicitud,
            motivo:         v.motivo,
            tipoResolucion: v.tipoResolucion,
            monto:          v.monto,
            observaciones:  v.observaciones || null,
        };
        const opts = { params: { companyId: this.companyId() } };
        const req = this.editMode() && this.selectedId()
            ? this.http.put<Devolucion>(`${this.baseUrl}/${this.selectedId()}`, body, opts)
            : this.http.post<Devolucion>(this.baseUrl, body, opts);

        req.subscribe({
            next: () => {
                this.guardando.set(false);
                this.cerrarModal();
                this.loadPage();
                this.loadStats();
            },
            error: (err) => {
                this.guardando.set(false);
                this.submitError.set(err?.error?.message ?? 'No se pudo guardar la devolución');
            }
        });
    }

    cambiarEstado(id: string, estado: EstadoDevolucion): void {
        this.http.patch<Devolucion>(`${this.baseUrl}/${id}/estado`, { estado },
            { params: { companyId: this.companyId() } }).subscribe({
            next: () => {
                this.loadPage();
                this.loadStats();
            },
            error: () => { /* mantener estado actual si falla */ }
        });
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
            pedidoId:       null,
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
