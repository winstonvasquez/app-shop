import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { staticFilter, signalFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { Sucursal, SucursalInput, SucursalService } from '@features/admin/services/sucursal.service';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { bloquearEnEdicion } from '@shared/utils/form-lock';
import { UbigeoSelectComponent } from '@shared/components';

@Component({
    selector: 'app-sucursales',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, DataTableComponent, PageHeaderComponent, UbigeoSelectComponent],
    templateUrl: './sucursales.component.html',
    styleUrl: './sucursales.component.scss',
})
export class SucursalesComponent implements OnInit {
    private readonly svc = inject(SucursalService);
    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    private readonly http = inject(HttpClient);

    sucursales = signal<Sucursal[]>([]);

    // Filtros / búsqueda (TODOS server-side — la vista nunca filtra la página cargada)
    searchQuery = signal('');
    filterActivo = signal('');
    filterListaPreciosId = signal('');
    filterFechaCreacionDesde = signal<string | undefined>(undefined);
    filterFechaCreacionHasta = signal<string | undefined>(undefined);

    // Paginación server-side (GET /pos/sucursales/paged)
    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    /** Listas de precios de la empresa para el select de filtro (lista chica, no requiere server-search). */
    listasPreciosFiltro = signal<{ id: number; nombre: string }[]>([]);

    // Filtros select del toolbar. `almacenId` y `ubigeo` NO se cablean: `SucursalEntity.almacenId`
    // es un Long heredado de antes de que los almacenes migraran a UUID en microshoplogistica (sin
    // fuente Long válida de opciones) y `SucursalEntity.ubigeo` guarda el ubigeo distrital completo
    // (6 dígitos) comparado por IGUALDAD exacta -- el catálogo UBIGEO_DEPARTAMENTO son NOMBRES de
    // departamento ("LIMA", "CALLAO"...), nunca calzarían. Cablear cualquiera de los dos produciría
    // un filtro que siempre devuelve 0 resultados.
    readonly filters: FilterConfig[] = [
        staticFilter('activo', 'Estado', ACTIVO_OPTIONS),
        signalFilter('listaPreciosId', 'Lista de precios', this.listasPreciosFiltro,
            l => ({ value: l.id, label: l.nombre })),
    ];

    readonly dateRangeFilters: DateRangeFilterConfig[] = [
        { field: 'fechaCreacion', label: 'Fecha de creación' },
    ];

    columns: TableColumn<Sucursal>[] = [
        { key: 'nombre', label: 'Nombre', sortable: true, html: true,
          render: (s) => `<strong>${s.nombre}</strong>` },
        { key: 'direccion', label: 'Dirección',
          render: (s) => (s.direccion || '—') + (s.ubigeo ? ` · ubigeo ${s.ubigeo}` : '') },
        { key: 'serieBoleta', label: 'Series CPE',
          render: (s) => `${s.serieBoleta || '—'} / ${s.serieFactura || '—'}` },
        { key: 'activo', label: 'Estado', html: true,
          render: (s) => `<span class="badge ${s.activo ? 'badge-success' : 'badge-neutral'}">${s.activo ? 'Activa' : 'Inactiva'}</span>` }
    ];

    readonly exportConfig: BackendExportConfig = {
        url: `${environment.apiUrls.pos}/sucursales/export`,
        filename: 'sucursales',
        params: () => ({
            companyId: this.currentCompanyId(),
            search: this.searchQuery() || undefined,
            activo: this.filterActivo() || undefined,
            listaPreciosId: this.filterListaPreciosId() || undefined,
            fechaCreacionDesde: this.filterFechaCreacionDesde(),
            fechaCreacionHasta: this.filterFechaCreacionHasta(),
        }),
    };

    actions: TableAction<Sucursal>[] = [
        { label: 'Editar', icon: 'edit', class: 'btn-icon-edit', onClick: (s) => this.openEdit(s) },
        { label: 'Desactivar', icon: 'delete', class: 'btn-icon-delete',
          show: (s) => s.activo, onClick: (s) => this.deactivate(s) }
    ];

    loading = signal(false);
    error = signal<string | null>(null);

    showForm = signal(false);
    editingId = signal<number | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    form: FormGroup = this.fb.group({
        nombre: ['', Validators.required],
        direccion: [''],
        ubigeo: [''],
        telefono: [''],
        serieBoleta: [''],
        serieFactura: [''],
        // Baja lógica reversible: permite reactivar una sucursal desactivada desde el propio formulario.
        activo: [true],
    });

    /**
     * Series CPE: son los correlativos SUNAT de la sucursal. Cambiarlas después de emitir
     * el primer comprobante rompe la numeración declarada (y el PLE). Se muestran
     * bloqueadas en edición, nunca ocultas.
     */
    private static readonly CAMPOS_BLOQUEADOS = ['serieBoleta', 'serieFactura'] as const;

    isEmpty = computed(() => !this.loading() && this.sucursales().length === 0);

    ngOnInit() {
        this.load();
        this.loadListasPreciosFiltro();
    }

    private currentCompanyId(): number {
        return this.auth.currentUser()?.activeCompanyId ?? 1;
    }

    /** Listas de precios activas de la empresa para el select de filtro del toolbar. */
    private loadListasPreciosFiltro(): void {
        this.http.get<{ id: number; nombre: string }[]>(`${environment.apiUrls.pos}/listas-precios`, {
            params: { companyId: String(this.currentCompanyId()) }
        }).subscribe({
            next: (res) => this.listasPreciosFiltro.set(res ?? []),
            error: () => this.listasPreciosFiltro.set([])
        });
    }

    /** Carga la página actual server-side (search + filtros + fecha + 20/pág). */
    load() {
        this.loading.set(true);
        this.error.set(null);
        this.svc.listPaged(this.currentCompanyId(), {
            page: this.currentPage(),
            size: this.pageSize(),
            q: this.searchQuery() || undefined,
            activo: this.filterActivo() || undefined,
            listaPreciosId: this.filterListaPreciosId() || undefined,
            fechaCreacionDesde: this.filterFechaCreacionDesde(),
            fechaCreacionHasta: this.filterFechaCreacionHasta(),
        }).subscribe({
            next: (res) => {
                this.sucursales.set(res.content ?? []);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: err => {
                this.error.set(err?.error?.detail ?? 'Error cargando sucursales');
                this.loading.set(false);
            },
        });
    }

    /** La búsqueda por texto también va al backend, nunca filtra la página cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.load();
    }

    onFilterChangeEvent(event: FilterChangeEvent): void {
        const valor = event.value != null ? String(event.value) : '';
        switch (event.field) {
            case 'activo':         this.filterActivo.set(valor); break;
            case 'listaPreciosId': this.filterListaPreciosId.set(valor); break;
            default: return;
        }
        this.currentPage.set(0);
        this.load();
    }

    onDateRangeChange(event: DateRangeChangeEvent): void {
        if (event.field !== 'fechaCreacion') return;
        this.filterFechaCreacionDesde.set(event.from ?? undefined);
        this.filterFechaCreacionHasta.set(event.to ?? undefined);
        this.currentPage.set(0);
        this.load();
    }

    /** "Limpiar filtros": resetea TODOS los signals y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterActivo.set('');
        this.filterListaPreciosId.set('');
        this.filterFechaCreacionDesde.set(undefined);
        this.filterFechaCreacionHasta.set(undefined);
        this.currentPage.set(0);
        this.load();
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.load();
    }

    openCreate() {
        this.editingId.set(null);
        this.form.reset({ activo: true });
        bloquearEnEdicion(this.form, SucursalesComponent.CAMPOS_BLOQUEADOS, false);
        this.showForm.set(true);
    }

    openEdit(s: Sucursal) {
        this.editingId.set(s.id);
        this.form.patchValue({
            nombre: s.nombre,
            direccion: s.direccion ?? '',
            ubigeo: s.ubigeo ?? '',
            telefono: s.telefono ?? '',
            serieBoleta: s.serieBoleta ?? '',
            serieFactura: s.serieFactura ?? '',
            activo: s.activo,
        });
        bloquearEnEdicion(this.form, SucursalesComponent.CAMPOS_BLOQUEADOS, true);
        this.showForm.set(true);
    }

    cancel() {
        this.showForm.set(false);
        this.submitError.set(null);
    }

    submit() {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        this.submitError.set(null);

        // getRawValue(): serieBoleta/serieFactura quedan deshabilitadas en edición y no
        // saldrían en form.value — se enviarían nulls y se borrarían las series SUNAT.
        // El spread incluye `activo` (checkbox de estado); el backend solo respeta el
        // estado actual cuando llega null, así que se manda siempre explícito.
        const raw = this.form.getRawValue();
        const input: SucursalInput = {
            companyId: this.currentCompanyId(),
            ...raw,
            activo: raw.activo !== false,
        };

        const id = this.editingId();
        const op$ = id ? this.svc.update(id, input) : this.svc.create(input);
        op$.subscribe({
            next: () => {
                this.submitting.set(false);
                this.showForm.set(false);
                this.load();
            },
            error: err => {
                this.submitting.set(false);
                this.submitError.set(err?.error?.detail ?? 'Error al guardar');
            },
        });
    }

    deactivate(s: Sucursal) {
        if (!confirm(`¿Desactivar sucursal "${s.nombre}"?`)) return;
        this.svc.deactivate(s.id).subscribe({
            next: () => this.load(),
            error: err => this.error.set(err?.error?.detail ?? 'Error al desactivar'),
        });
    }
}
