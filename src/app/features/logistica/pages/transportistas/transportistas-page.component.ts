import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { TransportistaService } from '../../services/transportista.service';
import { Transportista } from '../../models/transportista.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import {
    DataTableComponent, TableColumn, TableAction,
    FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PAGINATION } from '@shared/constants/app.constants';
import { bloquearEnEdicion } from '@shared/utils/form-lock';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { CatalogService } from '@core/services/catalog.service';

@Component({
    selector: 'app-transportistas-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        ButtonComponent,
        DataTableComponent,
        DrawerComponent,
        AlertComponent,
        PageHeaderComponent,
        CatalogSelectComponent
    ],
    templateUrl: './transportistas-page.component.html'
})
export class TransportistasPageComponent implements OnInit {
    private readonly service   = inject(TransportistaService);
    private readonly authService = inject(AuthService);
    private readonly fb        = inject(FormBuilder);
    readonly catalog = inject(CatalogService);

    // Data
    items    = signal<Transportista[]>([]);
    selected = signal<Transportista | null>(null);

    // UI state
    loading     = signal(false);
    error       = signal<string | null>(null);
    showForm    = signal(false);
    editMode    = signal(false);
    submitting  = signal(false);
    submitError = signal<string | null>(null);

    // Filtros (TODOS server-side — GET /carriers/paged, la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterServiceType = signal('');
    filterActive = signal('');
    filterApiEnabled = signal('');
    filterFechaCreacionDesde = signal<string | null>(null);
    filterFechaCreacionHasta = signal<string | null>(null);

    // Pagination
    currentPage   = signal(0);
    pageSize      = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages    = signal(0);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Transportistas' }
    ];

    // Filtros select del toolbar. serviceType sale de erp_parameters; active/apiEnabled son
    // columnas boolean (sin catálogo en erp_parameters, mismo patrón que ordenes-compra).
    filters: FilterConfig[] = [
        catalogFilter(this.catalog, 'TIPO_SERVICIO_TRANSPORTISTA', 'serviceType', 'Tipo de servicio'),
        staticFilter('active', 'Estado', ACTIVO_OPTIONS),
        staticFilter('apiEnabled', 'Integración API', ACTIVO_OPTIONS)
    ];

    dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaCreacion', label: 'Fecha de alta' }
    ];

    /**
     * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios,
     * respetando los mismos filtros que /carriers/paged. Ver /logistics/api/carriers/export.
     */
    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.logistics}/api/carriers/export`,
        filename: 'transportistas',
        params: () => ({
            q: this.searchQuery(),
            serviceType: this.filterServiceType(),
            active: this.filterActive(),
            apiEnabled: this.filterApiEnabled(),
            fechaCreacionDesde: this.filterFechaCreacionDesde() ?? undefined,
            fechaCreacionHasta: this.filterFechaCreacionHasta() ?? undefined
        })
    };

    columns: TableColumn<Transportista>[] = [
        { key: 'code',        label: 'Código',   width: '100px' },
        { key: 'name',        label: 'Nombre' },
        { key: 'serviceType', label: 'Tipo Servicio',
          render: (r) => this.catalog.label('TIPO_SERVICIO_TRANSPORTISTA', r.serviceType) },
        { key: 'contactPhone', label: 'Teléfono', render: (r) => r.contactPhone || '—' },
        { key: 'contactEmail', label: 'Email',    render: (r) => r.contactEmail || '—' },
        { key: 'active', label: 'Estado', html: true,
          render: (r) => r.active
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-neutral">Inactivo</span>' }
    ];

    actions: TableAction<Transportista>[] = [
        {
            label: 'Editar', icon: '✏️', class: 'btn-view',
            onClick: (row) => this.openEditForm(row)
        },
        {
            label: 'Desactivar', icon: '✕', class: 'btn-view',
            show: (row) => row.active,
            onClick: (row) => this.toggleActivo(row, false)
        },
        {
            label: 'Activar', icon: '✓', class: 'btn-view',
            show: (row) => !row.active,
            onClick: (row) => this.toggleActivo(row, true)
        }
    ];

    form: FormGroup;

    constructor() {
        this.form = this.fb.group({
            code:         ['', [Validators.required, Validators.maxLength(50)]],
            name:         ['', [Validators.required, Validators.maxLength(100)]],
            serviceType:  ['STANDARD', Validators.required],
            contactPhone: [''],
            contactEmail: ['', Validators.email],
            apiUrl:       [''],
            active:       [true]
        });
    }

    private get companyId(): string {
        return String(this.authService.currentUser()?.activeCompanyId ?? 1);
    }

    ngOnInit() {
        this.loadItems();
    }

    loadItems() {
        this.loading.set(true);
        this.error.set(null);
        this.service.getCarriersPaged({
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            serviceType: this.filterServiceType() || undefined,
            active: this.filterActive() === '' ? undefined : this.filterActive() === 'true',
            apiEnabled: this.filterApiEnabled() === '' ? undefined : this.filterApiEnabled() === 'true',
            fechaCreacionDesde: this.filterFechaCreacionDesde() || undefined,
            fechaCreacionHasta: this.filterFechaCreacionHasta() || undefined
        }).subscribe({
            next: (res) => {
                this.items.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message ?? 'Error al cargar transportistas.');
                this.loading.set(false);
            }
        });
    }

    /** La búsqueda por texto va al backend (`q`), no filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.loadItems();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'serviceType': this.filterServiceType.set(valor); break;
            case 'active':      this.filterActive.set(valor); break;
            case 'apiEnabled':  this.filterApiEnabled.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.loadItems();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field === 'fechaCreacion') {
            this.filterFechaCreacionDesde.set(event.from);
            this.filterFechaCreacionHasta.set(event.to);
            this.currentPage.set(0);
            this.loadItems();
        }
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterServiceType.set('');
        this.filterActive.set('');
        this.filterApiEnabled.set('');
        this.filterFechaCreacionDesde.set(null);
        this.filterFechaCreacionHasta.set(null);
        this.currentPage.set(0);
        this.loadItems();
    }

    onPaginationChange(event: PaginationChangeEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadItems();
    }

    openCreateForm() {
        this.editMode.set(false);
        this.selected.set(null);
        this.form.reset({ serviceType: 'STANDARD', active: true });
        // `code` es la clave del transportista en envíos y guías de remisión ya emitidas:
        // se escribe al crear y se lee bloqueado al editar. Ver @shared/utils/form-lock.
        bloquearEnEdicion(this.form, ['code'], false);
        this.submitError.set(null);
        this.showForm.set(true);
    }

    openEditForm(item: Transportista) {
        this.editMode.set(true);
        this.selected.set(item);
        this.form.patchValue({
            code:         item.code,
            name:         item.name,
            serviceType:  item.serviceType,
            contactPhone: item.contactPhone ?? '',
            contactEmail: item.contactEmail ?? '',
            apiUrl:       item.apiUrl ?? '',
            active:       item.active
        });
        bloquearEnEdicion(this.form, ['code'], true);
        this.submitError.set(null);
        this.showForm.set(true);
    }

    closeForm() {
        this.showForm.set(false);
        this.form.reset();
    }

    onSubmit() {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }

        this.submitting.set(true);
        this.submitError.set(null);

        // Fix ronda 3 (2026-07-26): el PUT de transportista usa `CreateCarrierRequest` COMPLETO y
        // `CarrierCommandService.update()` asigna baseCost/costPerKg sin null-check. Este formulario
        // no edita tarifas (se configuran en la página de SLA) → si no las reenviamos, editar el
        // nombre/teléfono acá BORRABA silenciosamente la tarifa del transportista y el costo de
        // envío volvía a registrarse en S/ 0.00. Se reenvían tal como vinieron del listado.
        // getRawValue() y NO .value: `code` va deshabilitado en edición y .value lo omitiría,
        // enviando `code: null` en el PUT y borrando el código del transportista.
        const actual = this.selected();
        const payload = {
            ...this.form.getRawValue(),
            baseCost:  actual?.baseCost ?? null,
            costPerKg: actual?.costPerKg ?? null,
            tenantId:  this.companyId,
            companyId: this.companyId
        };

        const op = this.editMode()
            ? this.service.update(this.selected()!.id, payload)
            : this.service.create(payload);

        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeForm();
                this.loadItems();
            },
            error: (err: Error) => {
                this.submitError.set(err.message ?? 'Error al guardar transportista.');
                this.submitting.set(false);
            }
        });
    }

    toggleActivo(item: Transportista, active: boolean) {
        this.service.toggleActivo(item.id, active).subscribe({
            next: () => this.loadItems(),
            error: (err: Error) => this.error.set(err.message)
        });
    }
}
