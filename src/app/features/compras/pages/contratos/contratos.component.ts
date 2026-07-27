import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { MONEDA, Moneda } from '@shared/constants/sunat.constants';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { CatalogService } from '@core/services/catalog.service';
import {
    DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, PaginationEvent,
    DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter, staticFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { PAGINATION } from '@shared/constants/app.constants';
import { ProveedorService, ProveedorFiltroOption, toProveedorOptions } from '../../services/proveedor.service';
import { BackendExportConfig } from '@shared/services/backend-export.service';

interface ContratoDto {
    id: string;
    codigo: string;
    proveedorId: string;
    proveedorNombre: string;
    tipoContrato: string;
    descripcion: string;
    fechaInicio: string;
    fechaFin: string;
    montoContrato: number;
    moneda: string;
    estado: string;
    condicionesPago: string;
    renovacionAutomatica: boolean;
    diasAvisoVencimiento: number;
    createdAt: string;
}

@Component({
    selector: 'app-contratos',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonComponent, CatalogSelectComponent, DataTableComponent],
    templateUrl: './contratos.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContratosComponent implements OnInit {
    private http = inject(HttpClient);
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private readonly catalog = inject(CatalogService);
    private readonly proveedorService = inject(ProveedorService);
    private baseUrl = `${environment.apiUrls.purchases}/api/contratos`;

    contratos = signal<ContratoDto[]>([]);
    proximosVencer = signal<ContratoDto[]>([]);
    cargando = signal(false);
    error = signal('');
    mostrarForm = signal(false);
    guardando = signal(false);
    filtroEstado = signal('');
    searchQuery = signal('');
    // Filtros adicionales (todos server-side)
    filterMoneda = signal('');
    filterProveedorId = signal('');
    filterRenovacionAutomatica = signal('');
    filterFechaInicioDesde = signal<string | null>(null);
    filterFechaInicioHasta = signal<string | null>(null);
    filterFechaFinDesde = signal<string | null>(null);
    filterFechaFinHasta = signal<string | null>(null);

    /** Proveedores activos para el select de filtro del toolbar. */
    proveedoresFiltro = signal<ProveedorFiltroOption[]>([]);
    /** Contrato en edición (null = el drawer está en modo creación). */
    modoEdicion = signal<ContratoDto | null>(null);

    // Pagination (server-side — /api/contratos ahora acepta Pageable)
    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    // Filtro de estado para el toolbar del data-table
    // Filtros select del toolbar. Las opciones salen de erp_parameters (fuente única).
    // `tipoContrato` NO se ofrece: en la BD solo existe el valor 'MARCO' → un select
    // de una sola opción no aporta (ver V35__seed_catalogos_filtros_avanzados.sql).
    estadoFilters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_CONTRATO_PROVEEDOR', 'estado', 'Todos los estados'),
        catalogFilter(this.catalog, 'MONEDA', 'moneda', 'Moneda'),
        signalFilter('proveedorId', 'Todos los proveedores', this.proveedoresFiltro,
            p => ({ value: p.id, label: p.razonSocial })),
        staticFilter('renovacionAutomatica', 'Renovación', [
            { value: 'true', label: 'Automática' },
            { value: 'false', label: 'Manual' },
        ]),
    ];

    /** Rangos de vigencia del contrato. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaInicio', label: 'Inicio' },
        { field: 'fechaFin', label: 'Fin' },
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta los filtros actuales búsqueda + estado). Ver /purchases/api/contratos/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.purchases}/api/contratos/export`,
        filename: 'contratos',
        params: () => ({
            search: this.searchQuery() || undefined,
            estado: this.filtroEstado() || undefined,
            moneda: this.filterMoneda() || undefined,
            proveedorId: this.filterProveedorId() || undefined,
            renovacionAutomatica: this.filterRenovacionAutomatica() || undefined,
            fechaInicioDesde: this.filterFechaInicioDesde() ?? undefined,
            fechaInicioHasta: this.filterFechaInicioHasta() ?? undefined,
            fechaFinDesde: this.filterFechaFinDesde() ?? undefined,
            fechaFinHasta: this.filterFechaFinHasta() ?? undefined,
        }),
    };

    // 'search' ahora se envía como query param a GET /api/contratos (server-side, igual que /export),
    // por lo que contratos() ya viene filtrado y paginado por el backend — no hace falta filtrado client-side.

    columns: TableColumn<ContratoDto>[] = [
        { key: 'codigo', label: 'Código', sortable: true },
        { key: 'proveedorNombre', label: 'Proveedor' },
        { key: 'tipoContrato', label: 'Tipo' },
        {
            key: 'fechaInicio', label: 'Vigencia',
            render: (r) => `${r.fechaInicio} — ${r.fechaFin}`
        },
        {
            key: 'montoContrato', label: 'Monto', align: 'right',
            render: (r) => `${r.moneda} ${r.montoContrato.toFixed(2)}`
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: (r) => `<span class="badge ${this.estadoClass(r.estado)}">${this.catalog.label('ESTADO_CONTRATO_PROVEEDOR', r.estado)}</span>`
        }
    ];

    actions: TableAction<ContratoDto>[] = [
        {
            label: 'Editar', icon: 'edit', class: 'btn-icon-edit',
            show: (row) => row.estado !== 'RESCINDIDO',
            onClick: (row) => this.abrirEditar(row)
        },
        {
            label: 'Rescindir', icon: 'x', class: 'btn-icon-delete',
            show: (row) => row.estado === 'ACTIVO',
            onClick: (row) => this.rescindir(row.id)
        }
    ];

    form = this.fb.group({
        proveedorId: ['', Validators.required],
        tipoContrato: ['MARCO', Validators.required],
        descripcion: ['', Validators.required],
        fechaInicio: ['', Validators.required],
        fechaFin: ['', Validators.required],
        montoContrato: [0, [Validators.required, Validators.min(0)]],
        moneda: [MONEDA.PEN as Moneda],
        condicionesPago: [''],
        penalidades: [''],
        renovacionAutomatica: [false],
        diasAvisoVencimiento: [30],
    });

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    ngOnInit(): void {
        this.cargar();
        this.cargarProximosVencer();
        this.loadProveedoresFiltro();
    }

    /** Proveedores activos para el select de filtro del toolbar. */
    private loadProveedoresFiltro(): void {
        this.proveedorService.getProveedores({ size: PAGINATION.maxPageSize, estado: 'ACTIVO' }).subscribe({
            next: (res) => this.proveedoresFiltro.set(toProveedorOptions(res.content)),
            error: () => this.proveedoresFiltro.set([])
        });
    }

    cargar(): void {
        this.cargando.set(true);
        let params = new HttpParams()
            .set('page', this.currentPage().toString())
            .set('size', this.pageSize().toString());
        if (this.filtroEstado()) params = params.set('estado', this.filtroEstado());
        if (this.searchQuery()) params = params.set('search', this.searchQuery());
        if (this.filterMoneda()) params = params.set('moneda', this.filterMoneda());
        if (this.filterProveedorId()) params = params.set('proveedorId', this.filterProveedorId());
        if (this.filterRenovacionAutomatica()) params = params.set('renovacionAutomatica', this.filterRenovacionAutomatica());
        if (this.filterFechaInicioDesde()) params = params.set('fechaInicioDesde', this.filterFechaInicioDesde()!);
        if (this.filterFechaInicioHasta()) params = params.set('fechaInicioHasta', this.filterFechaInicioHasta()!);
        if (this.filterFechaFinDesde()) params = params.set('fechaFinDesde', this.filterFechaFinDesde()!);
        if (this.filterFechaFinHasta()) params = params.set('fechaFinHasta', this.filterFechaFinHasta()!);

        this.http.get<unknown>(this.baseUrl, { params, headers: this.getHeaders() }).pipe(
            map((raw: unknown) => {
                const r = raw as Record<string, unknown>;
                const nested = r['page'] as Record<string, unknown> | undefined;
                return {
                    content: (r['content'] as ContratoDto[]) ?? [],
                    totalElements: (r['totalElements'] as number) ?? (nested?.['totalElements'] as number) ?? 0,
                    totalPages: (r['totalPages'] as number) ?? (nested?.['totalPages'] as number) ?? 0,
                };
            })
        ).subscribe({
            next: (page) => {
                this.contratos.set(page.content);
                this.totalElements.set(page.totalElements);
                this.totalPages.set(page.totalPages);
                this.cargando.set(false);
            },
            error: () => { this.error.set('Error al cargar contratos'); this.cargando.set(false); }
        });
    }

    /** Se llama SOLO una vez desde ngOnInit — no depende de la página/filtro actual, no hace falta re-pedirla en cada cargar(). */
    private cargarProximosVencer(): void {
        this.http.get<ContratoDto[]>(`${this.baseUrl}/proximos-vencer?dias=30`, { headers: this.getHeaders() }).subscribe({
            next: (d) => this.proximosVencer.set(d),
            error: () => {}
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando.set(true);
        const v = this.form.value;
        const editando = this.modoEdicion();
        const req = editando
            ? this.http.put<ContratoDto>(`${this.baseUrl}/${editando.id}`, v, { headers: this.getHeaders() })
            : this.http.post<ContratoDto>(this.baseUrl, v, { headers: this.getHeaders() });
        req.subscribe({
            next: () => {
                this.guardando.set(false);
                this.cerrarForm();
                this.cargar();
            },
            error: () => { this.guardando.set(false); this.error.set(editando ? 'Error al actualizar contrato' : 'Error al crear contrato'); }
        });
    }

    /** Abre el drawer en modo creación, con el form limpio en sus valores por defecto. */
    abrirCrear(): void {
        this.modoEdicion.set(null);
        this.form.get('proveedorId')?.enable();
        this.form.get('fechaInicio')?.enable();
        this.form.reset({
            proveedorId: '', tipoContrato: 'MARCO', descripcion: '',
            fechaInicio: '', fechaFin: '', montoContrato: 0, moneda: MONEDA.PEN,
            condicionesPago: '', penalidades: '', renovacionAutomatica: false, diasAvisoVencimiento: 30,
        });
        this.mostrarForm.set(true);
    }

    /**
     * Abre el drawer en modo edición, precargado con los datos de la fila (mismo shape que GET /{id}).
     * proveedorId y fechaInicio no son editables (ActualizarContratoRequest no los acepta) — se deshabilitan.
     */
    abrirEditar(contrato: ContratoDto): void {
        this.modoEdicion.set(contrato);
        this.form.reset({
            proveedorId: contrato.proveedorId,
            tipoContrato: contrato.tipoContrato,
            descripcion: contrato.descripcion,
            fechaInicio: contrato.fechaInicio,
            fechaFin: contrato.fechaFin,
            montoContrato: contrato.montoContrato,
            moneda: contrato.moneda as Moneda,
            condicionesPago: contrato.condicionesPago,
            penalidades: '',
            renovacionAutomatica: contrato.renovacionAutomatica,
            diasAvisoVencimiento: contrato.diasAvisoVencimiento,
        });
        this.form.get('proveedorId')?.disable();
        this.form.get('fechaInicio')?.disable();
        this.mostrarForm.set(true);
    }

    cerrarForm(): void {
        this.mostrarForm.set(false);
        this.modoEdicion.set(null);
    }

    rescindir(id: string): void {
        this.http.put<ContratoDto>(`${this.baseUrl}/${id}/rescindir`, {}, { headers: this.getHeaders() }).subscribe({
            next: () => this.cargar(),
            error: () => this.error.set('Error al rescindir contrato')
        });
    }

    estadoClass(estado: string): string {
        const m: Record<string, string> = {
            ACTIVO: 'badge-success', VENCIDO: 'badge-error',
            SUSPENDIDO: 'badge-warning', RESCINDIDO: 'badge-neutral',
        };
        return m[estado] ?? 'badge-neutral';
    }

    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.cargar();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':               this.filtroEstado.set(valor); break;
            case 'moneda':               this.filterMoneda.set(valor); break;
            case 'proveedorId':          this.filterProveedorId.set(valor); break;
            case 'renovacionAutomatica': this.filterRenovacionAutomatica.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.cargar();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'fechaInicio') {
            this.filterFechaInicioDesde.set(event.from);
            this.filterFechaInicioHasta.set(event.to);
        } else if (event.field === 'fechaFin') {
            this.filterFechaFinDesde.set(event.from);
            this.filterFechaFinHasta.set(event.to);
        } else {
            return;
        }
        this.currentPage.set(0);
        this.cargar();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filtroEstado.set('');
        this.filterMoneda.set('');
        this.filterProveedorId.set('');
        this.filterRenovacionAutomatica.set('');
        this.filterFechaInicioDesde.set(null);
        this.filterFechaInicioHasta.set(null);
        this.filterFechaFinDesde.set(null);
        this.filterFechaFinHasta.set(null);
        this.currentPage.set(0);
        this.cargar();
    }

    onPageChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargar();
    }
}
