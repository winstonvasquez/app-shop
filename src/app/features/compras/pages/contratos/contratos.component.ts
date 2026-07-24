import { Component, OnInit, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { MONEDA } from '@shared/constants/sunat.constants';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { CatalogService } from '@core/services/catalog.service';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
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
    private baseUrl = `${environment.apiUrls.purchases}/api/contratos`;

    contratos = signal<ContratoDto[]>([]);
    proximosVencer = signal<ContratoDto[]>([]);
    cargando = signal(false);
    error = signal('');
    mostrarForm = signal(false);
    guardando = signal(false);
    filtroEstado = signal('');
    searchQuery = signal('');

    // Pagination (client-side — el backend no pagina /api/contratos)
    currentPage = signal(0);
    pageSize = signal(20);

    // Filtro de estado para el toolbar del data-table
    estadoFilters: FilterConfig[] = [
        {
            field: 'estado',
            label: 'Todos los estados',
            options: toObservable(this.catalog.options('ESTADO_CONTRATO_PROVEEDOR')).pipe(
                map(o => o.map(x => ({ value: x.codigo, label: x.valor })))
            )
        }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta los filtros actuales búsqueda + estado). Ver /purchases/api/contratos/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.purchases}/api/contratos/export`,
        filename: 'contratos',
        params: () => ({ search: this.searchQuery(), estado: this.filtroEstado() }),
    };

    /** Filtrado client-side por búsqueda + estado (todo el listado se carga en un solo fetch). */
    filteredContratos = computed(() => {
        const term = this.searchQuery().trim().toLowerCase();
        const estado = this.filtroEstado();
        return this.contratos().filter(c =>
            (!estado || c.estado === estado) &&
            (!term || c.codigo?.toLowerCase().includes(term) || c.proveedorNombre?.toLowerCase().includes(term))
        );
    });

    totalElements = computed(() => this.filteredContratos().length);
    totalPages = computed(() => Math.ceil(this.totalElements() / this.pageSize()) || 0);

    pagedContratos = computed(() => {
        const start = this.currentPage() * this.pageSize();
        return this.filteredContratos().slice(start, start + this.pageSize());
    });

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
        moneda: [MONEDA.PEN],
        condicionesPago: [''],
        penalidades: [''],
        renovacionAutomatica: [false],
        diasAvisoVencimiento: [30],
    });

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    ngOnInit(): void { this.cargar(); }

    cargar(): void {
        this.cargando.set(true);
        this.http.get<ContratoDto[]>(this.baseUrl, { headers: this.getHeaders() }).subscribe({
            next: (d) => {
                this.contratos.set(d);
                this.cargando.set(false);
            },
            error: () => { this.error.set('Error al cargar contratos'); this.cargando.set(false); }
        });
        this.http.get<ContratoDto[]>(`${this.baseUrl}/proximos-vencer?dias=30`, { headers: this.getHeaders() }).subscribe({
            next: (d) => this.proximosVencer.set(d),
            error: () => {}
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando.set(true);
        const v = this.form.value;
        this.http.post<ContratoDto>(this.baseUrl, v, { headers: this.getHeaders() }).subscribe({
            next: () => {
                this.guardando.set(false);
                this.mostrarForm.set(false);
                this.cargar();
            },
            error: () => { this.guardando.set(false); this.error.set('Error al crear contrato'); }
        });
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
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        if (event.field === 'estado') {
            this.filtroEstado.set(event.value != null ? String(event.value) : '');
            this.currentPage.set(0);
        }
    }

    onPageChange(event: PaginationEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }
}
