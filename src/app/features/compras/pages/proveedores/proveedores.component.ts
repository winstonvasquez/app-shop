import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { ProveedorService } from '../../services/proveedor.service';
import { Proveedor } from '../../models/proveedor.model';
import {
    DataTableComponent, TableColumn, TableAction, SortEvent, FilterConfig, FilterChangeEvent,
    DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, staticFilter } from '@shared/ui/tables/data-table/filter-helpers';
import { MONEDA } from '@shared/constants/sunat.constants';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { CatalogService } from '@core/services/catalog.service';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { bloquearEnEdicion } from '@shared/utils/form-lock';
import { environment } from '@env/environment';

@Component({
    selector: 'app-proveedores',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent,
        DrawerComponent,
        FormFieldComponent,
        PageHeaderComponent,
        AlertComponent,
        ButtonComponent,
        CatalogSelectComponent
    ],
    templateUrl: './proveedores.component.html'
})
export class ProveedoresComponent implements OnInit {
    private readonly proveedorService = inject(ProveedorService);
    private readonly fb = inject(FormBuilder);
    private readonly catalog = inject(CatalogService);

    // Data
    proveedores = signal<Proveedor[]>([]);
    selectedProveedor = signal<Proveedor | null>(null);

    // UI state
    loading = signal(false);
    error = signal<string | null>(null);
    showModal = signal(false);
    editMode = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    // Filters (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterEstado = signal('');
    filterCondicionSunat = signal('');
    filterCondicionPago = signal('');
    filterMonedaPreferida = signal('');
    filterNivelProveedor = signal('');
    filterAgenteRetencion = signal('');
    filterBanco = signal('');
    filterCreatedAtDesde = signal<string | null>(null);
    filterCreatedAtHasta = signal<string | null>(null);

    // Filtros select del toolbar. Las opciones salen de erp_parameters (fuente única).
    estadoFilters: FilterConfig[] = [
        catalogFilter(this.catalog, 'ESTADO_PROVEEDOR', 'estado', 'Estado'),
        catalogFilter(this.catalog, 'CONDICION_SUNAT', 'condicionSunat', 'Cond. SUNAT'),
        catalogFilter(this.catalog, 'CONDICION_PAGO', 'condicionPago', 'Cond. de pago'),
        catalogFilter(this.catalog, 'MONEDA', 'monedaPreferida', 'Moneda preferida'),
        catalogFilter(this.catalog, 'NIVEL_PROVEEDOR', 'nivelProveedor', 'Nivel de proveedor'),
        catalogFilter(this.catalog, 'BANCO', 'banco', 'Banco'),
        staticFilter('agenteRetencion', 'Agente de retención', [
            { value: 'true', label: 'Sí' },
            { value: 'false', label: 'No' },
        ]),
    ];

    /** Rango de fecha de alta para el toolbar del data-table. */
    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'createdAt', label: 'Fecha de alta' }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
     * (respeta TODOS los filtros actuales). Ver /purchases/api/proveedores/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.purchases}/api/proveedores/export`,
        filename: 'proveedores',
        params: () => ({
            search: this.searchQuery(),
            estado: this.filterEstado(),
            condicionSunat: this.filterCondicionSunat(),
            condicionPago: this.filterCondicionPago(),
            monedaPreferida: this.filterMonedaPreferida(),
            nivelProveedor: this.filterNivelProveedor(),
            agenteRetencion: this.filterAgenteRetencion() || undefined,
            banco: this.filterBanco(),
            createdAtDesde: this.filterCreatedAtDesde() ?? undefined,
            createdAtHasta: this.filterCreatedAtHasta() ?? undefined,
        }),
    };

    // Pagination
    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    // Sort
    sortField = signal('razonSocial');
    sortDirection = signal<'asc' | 'desc'>('asc');

    // Computed
    hasProveedores = computed(() => this.proveedores().length > 0);
    isEmpty = computed(() => !this.loading() && !this.hasProveedores());

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: '/admin' },
        { label: 'Compras', url: '/admin/compras/dashboard' },
        { label: 'Proveedores' }
    ];

    columns: TableColumn<Proveedor>[] = [
        {
            key: 'ruc', label: 'RUC', sortable: true, width: '130px',
            html: true, render: (r) => `<span class="font-mono text-sm">${r.ruc}</span>`
        },
        { key: 'razonSocial', label: 'Razón Social', sortable: true },
        {
            key: 'condicionSunat', label: 'Cond. SUNAT', html: true,
            render: (r) => `<span class="badge badge-${r.condicionSunat === 'HABIDO' ? 'success' : 'warning'}">${r.condicionSunat ?? '—'}</span>`
        },
        {
            key: 'condicionPago', label: 'Cond. Pago',
            render: (r) => r.condicionPago?.replace('_', ' ') ?? '—'
        },
        {
            key: 'contactoEmail', label: 'Email',
            render: (r) => r.contactoEmail ?? '—'
        },
        {
            key: 'estado', label: 'Estado', html: true,
            render: (r) => `<span class="badge badge-${r.estado === 'ACTIVO' ? 'success' : 'neutral'}">${this.catalog.label('ESTADO_PROVEEDOR', r.estado)}</span>`
        }
    ];

    // «Editar» SIEMPRE visible (también en INACTIVO): es la vía para reactivar el
    // proveedor desde el drawer. «Eliminar» (baja lógica) solo si sigue ACTIVO.
    actions: TableAction<Proveedor>[] = [
        {
            label: 'Editar', icon: '✏️', class: 'btn-view',
            onClick: (row) => this.openEditModal(row)
        },
        {
            label: 'Eliminar', icon: '🗑️', class: 'btn-delete',
            show: (row) => row.estado !== 'INACTIVO',
            onClick: (row) => this.onDelete(row)
        }
    ];

    proveedorForm: FormGroup;

    constructor() {
        this.proveedorForm = this.fb.group({
            ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
            razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
            nombreComercial: ['', [Validators.maxLength(200)]],
            condicionSunat: ['HABIDO'],
            // Estado del RUC en el padrón SUNAT: sí lo acepta ProveedorRequestDto.
            estadoSunat: ['ACTIVO'],
            // Estado interno del maestro (ACTIVO / INACTIVO): editable, porque es la
            // única forma de REACTIVAR un proveedor dado de baja con el botón Eliminar.
            estado: ['ACTIVO'],
            domicilioFiscal: [''],
            contactoNombre: [''],
            contactoTelefono: [''],
            contactoEmail: ['', [Validators.email]],
            banco: [''],
            cuentaBanco: [''],
            condicionPago: ['CONTADO'],
            monedaPreferida: [MONEDA.PEN],
            // Nivel de desempeño: editable, pero las evaluaciones lo recalculan después.
            nivelProveedor: [''],
            // COM-303: marca SUNAT de agente de retención (boolean en el backend).
            agenteRetencion: [false]
        });
    }

    ngOnInit(): void {
        this.loadProveedores();
    }

    loadProveedores(): void {
        this.loading.set(true);
        this.error.set(null);
        this.proveedorService.getProveedores({
            page: this.currentPage(),
            size: this.pageSize(),
            search: this.searchQuery() || undefined,
            estado: this.filterEstado() || undefined,
            condicionSunat: this.filterCondicionSunat() || undefined,
            condicionPago: this.filterCondicionPago() || undefined,
            monedaPreferida: this.filterMonedaPreferida() || undefined,
            nivelProveedor: this.filterNivelProveedor() || undefined,
            agenteRetencion: this.filterAgenteRetencion() || undefined,
            banco: this.filterBanco() || undefined,
            createdAtDesde: this.filterCreatedAtDesde() || undefined,
            createdAtHasta: this.filterCreatedAtHasta() || undefined,
        }).subscribe({
            next: (res) => {
                this.proveedores.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadProveedores();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'estado':          this.filterEstado.set(valor); break;
            case 'condicionSunat':  this.filterCondicionSunat.set(valor); break;
            case 'condicionPago':   this.filterCondicionPago.set(valor); break;
            case 'monedaPreferida': this.filterMonedaPreferida.set(valor); break;
            case 'nivelProveedor':  this.filterNivelProveedor.set(valor); break;
            case 'agenteRetencion': this.filterAgenteRetencion.set(valor); break;
            case 'banco':           this.filterBanco.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadProveedores();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'createdAt') {
            this.filterCreatedAtDesde.set(event.from);
            this.filterCreatedAtHasta.set(event.to);
            this.currentPage.set(0);
            this.loadProveedores();
        }
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterCondicionSunat.set('');
        this.filterCondicionPago.set('');
        this.filterMonedaPreferida.set('');
        this.filterNivelProveedor.set('');
        this.filterAgenteRetencion.set('');
        this.filterBanco.set('');
        this.filterCreatedAtDesde.set(null);
        this.filterCreatedAtHasta.set(null);
        this.currentPage.set(0);
        this.loadProveedores();
    }

    onSort(event: SortEvent): void {
        this.sortField.set(event.field);
        this.sortDirection.set(event.direction);
        this.currentPage.set(0);
        this.loadProveedores();
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadProveedores();
    }

    openCreateModal(): void {
        this.editMode.set(false);
        this.selectedProveedor.set(null);
        this.proveedorForm.reset({
            condicionSunat: 'HABIDO', estadoSunat: 'ACTIVO', estado: 'ACTIVO',
            condicionPago: 'CONTADO', monedaPreferida: MONEDA.PEN,
            nivelProveedor: '', agenteRetencion: false
        });
        this.aplicarBloqueos();
        this.submitError.set(null);
        this.showModal.set(true);
    }

    /**
     * Bloqueo único del drawer (ver `@shared/utils/form-lock`):
     * - `ruc` es la identidad tributaria: se registra al crear y no se puede reapuntar después.
     * - `estado` YA NO se bloquea: el backend lo acepta en ProveedorRequestDto y es la
     *   única vía para reactivar un proveedor dado de baja.
     */
    private aplicarBloqueos(): void {
        bloquearEnEdicion(this.proveedorForm, ['ruc'], this.editMode());
    }

    openEditModal(proveedor: Proveedor): void {
        this.editMode.set(true);
        this.selectedProveedor.set(proveedor);
        this.proveedorForm.patchValue({
            ruc: proveedor.ruc,
            razonSocial: proveedor.razonSocial,
            nombreComercial: proveedor.nombreComercial ?? '',
            condicionSunat: proveedor.condicionSunat ?? 'HABIDO',
            estadoSunat: proveedor.estadoSunat ?? 'ACTIVO',
            estado: proveedor.estado ?? 'ACTIVO',
            domicilioFiscal: proveedor.domicilioFiscal ?? '',
            contactoNombre: proveedor.contactoNombre ?? '',
            contactoTelefono: proveedor.contactoTelefono ?? '',
            contactoEmail: proveedor.contactoEmail ?? '',
            banco: proveedor.banco ?? '',
            cuentaBanco: proveedor.cuentaBanco ?? '',
            condicionPago: proveedor.condicionPago ?? 'CONTADO',
            monedaPreferida: proveedor.monedaPreferida ?? MONEDA.PEN,
            nivelProveedor: proveedor.nivelProveedor ?? '',
            agenteRetencion: proveedor.agenteRetencion ?? false
        });
        this.aplicarBloqueos();
        this.submitError.set(null);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.proveedorForm.reset();
    }

    onSubmit(): void {
        if (this.proveedorForm.invalid) {
            this.proveedorForm.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.submitError.set(null);

        // getRawValue(): `ruc` (bloqueado en edición) no aparece en `.value` y se perdería.
        // `estado` sí viaja: el backend lo aplica (null/'' = no tocar) y permite reactivar.
        const val = this.proveedorForm.getRawValue() as Partial<Proveedor>;
        const op = this.editMode()
            ? this.proveedorService.updateProveedor(this.selectedProveedor()!.id!, val)
            : this.proveedorService.createProveedor(val);

        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeModal();
                this.loadProveedores();
            },
            error: (err: Error) => {
                this.submitError.set(err.message);
                this.submitting.set(false);
            }
        });
    }

    onDelete(proveedor: Proveedor): void {
        if (!confirm(`¿Eliminar proveedor "${proveedor.razonSocial}"?`)) return;
        this.loading.set(true);
        this.proveedorService.deleteProveedor(proveedor.id!).subscribe({
            next: () => this.loadProveedores(),
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    getControl(name: string): FormControl {
        return this.proveedorForm.get(name) as FormControl;
    }
}
