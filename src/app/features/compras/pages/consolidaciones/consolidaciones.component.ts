import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { ButtonComponent, ServerSearchSelectComponent, RichTextEditorComponent } from '@shared/components';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { PAGINATION } from '@shared/constants/app.constants';
import { ProveedorService } from '../../services/proveedor.service';
import { proveedorSelectSource } from '../../components/select-sources';
import { SucursalService, Sucursal } from '../../../admin/services/sucursal.service';
import { ProductLookupComponent } from '../../../inventory/components/product-lookup/product-lookup.component';
import { ProductResponse } from '@core/models/product.model';
import { productIdToUuid } from '../../../inventory/utils/synthetic-uuid.util';

interface TiendaReq { storeId: string; storeNombre: string; cantidad: number; }
interface LineaReq { productoId: string; sku?: string; productoNombre: string; unidadMedida?: string; tiendas: TiendaReq[]; }

interface ConsolidacionDto {
    id: string;
    codigo: string;
    descripcion: string;
    estado: string;
    lineas: Array<{
        id: string;
        productoId: string;
        sku?: string;
        productoNombre: string;
        cantidadTotal: number;
        unidadMedida?: string;
        proveedorId?: string;
        precioUnitario?: number;
        ordenCompraId?: string;
        tiendas: Array<{ id: string; storeId: string; storeNombre: string; cantidad: number }>;
    }>;
    createdAt: string;
}

@Component({
    selector: 'app-consolidaciones',
    standalone: true,
    imports: [ReactiveFormsModule, FormsModule, DecimalPipe, ButtonComponent, ServerSearchSelectComponent, ProductLookupComponent, PaginationComponent, RichTextEditorComponent],
    templateUrl: './consolidaciones.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsolidacionesComponent implements OnInit {
    private http = inject(HttpClient);
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private proveedorService = inject(ProveedorService);
    private sucursalService = inject(SucursalService);
    protected readonly catalog = inject(CatalogService);
    private baseUrl = `${environment.apiUrls.purchases}/api/consolidaciones`;

    readonly proveedorSource = proveedorSelectSource(this.proveedorService);

    /** Sucursales del tenant para el select de tienda de cada línea (reemplaza el ID libre). */
    sucursales = signal<Sucursal[]>([]);
    /** Índice de la línea con el mini-panel de búsqueda de producto abierto (null = cerrado). */
    lookupOpenIndex = signal<number | null>(null);

    consolidaciones = signal<ConsolidacionDto[]>([]);
    cargando = signal(false);
    error = signal('');
    mostrarForm = signal(false);
    guardando = signal(false);

    // Filtros (TODOS server-side — la vista nunca filtra la lista cargada)
    searchQuery = signal('');
    filterEstado = signal('');
    filterProveedorId = signal('');
    filterCreatedAtDesde = signal('');
    filterCreatedAtHasta = signal('');

    // Paginación (el endpoint pasó de List<> a Page<> — ver CONTRATOS-CAMBIADOS.md)
    currentPage = signal(0);
    pageSize = signal<number>(PAGINATION.defaultPageSize);
    totalElements = signal(0);
    totalPages = signal(0);

    // Asignación de proveedor a una línea puntual (mini-modal)
    asignandoConsolidacionId = signal<string | null>(null);
    asignandoLineaId = signal<string | null>(null);
    asignando = signal(false);

    form = this.fb.group({
        descripcion: ['', Validators.required],
        lineas: this.fb.array([this.createLineaFormGroup()]),
    });

    proveedorForm = this.fb.group({
        proveedorId: ['', Validators.required],
        precioUnitario: [0, [Validators.required, Validators.min(0)]],
    });

    get lineasArray(): FormArray {
        return this.form.get('lineas') as FormArray;
    }

    ngOnInit(): void {
        this.cargar();
        this.loadSucursales();
    }

    /** Sucursales activas del tenant, para el select de tienda (lista chica, no requiere server-search). */
    private loadSucursales(): void {
        const companyId = this.authService.currentUser()?.activeCompanyId;
        if (companyId === undefined || companyId === null) {
            this.sucursales.set([]);
            return;
        }
        this.sucursalService.list(companyId).subscribe({
            next: (list) => this.sucursales.set(list),
            error: () => this.sucursales.set([]),
        });
    }

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    cargar(): void {
        this.cargando.set(true);
        let params = new HttpParams()
            .set('page', this.currentPage().toString())
            .set('size', this.pageSize().toString());
        if (this.searchQuery()) params = params.set('q', this.searchQuery());
        if (this.filterEstado()) params = params.set('estado', this.filterEstado());
        if (this.filterProveedorId()) params = params.set('proveedorId', this.filterProveedorId());
        if (this.filterCreatedAtDesde()) params = params.set('createdAtDesde', this.filterCreatedAtDesde());
        if (this.filterCreatedAtHasta()) params = params.set('createdAtHasta', this.filterCreatedAtHasta());

        this.http.get<unknown>(this.baseUrl, { headers: this.getHeaders(), params }).subscribe({
            next: (raw) => {
                const r = raw as Record<string, unknown>;
                this.consolidaciones.set((r['content'] as ConsolidacionDto[]) ?? []);
                this.totalElements.set(pageTotalElements(r));
                this.totalPages.set(pageTotalPages(r));
                this.cargando.set(false);
            },
            error: () => { this.error.set('Error al cargar consolidaciones'); this.cargando.set(false); }
        });
    }

    /** La búsqueda por texto también va al backend (`q`), no filtra la lista cargada. */
    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
        this.cargar();
    }

    onFilterEstado(event: Event): void {
        this.filterEstado.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
        this.cargar();
    }

    onFilterProveedor(proveedorId: string | number | null): void {
        this.filterProveedorId.set(proveedorId != null ? String(proveedorId) : '');
        this.currentPage.set(0);
        this.cargar();
    }

    onCreatedAtDesde(value: string): void {
        this.filterCreatedAtDesde.set(value);
        this.currentPage.set(0);
        this.cargar();
    }

    onCreatedAtHasta(value: string): void {
        this.filterCreatedAtHasta.set(value);
        this.currentPage.set(0);
        this.cargar();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    limpiarFiltros(): void {
        this.searchQuery.set('');
        this.filterEstado.set('');
        this.filterProveedorId.set('');
        this.filterCreatedAtDesde.set('');
        this.filterCreatedAtHasta.set('');
        this.currentPage.set(0);
        this.cargar();
    }

    onPageChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.cargar();
    }

    /** true si hay al menos un filtro activo — controla la visibilidad del botón "Limpiar". */
    hayFiltrosActivos(): boolean {
        return !!(this.searchQuery() || this.filterEstado() || this.filterProveedorId()
            || this.filterCreatedAtDesde() || this.filterCreatedAtHasta());
    }

    abrirForm(): void {
        this.form.reset({ descripcion: '' });
        while (this.lineasArray.length > 0) this.lineasArray.removeAt(0);
        this.lineasArray.push(this.createLineaFormGroup());
        this.lookupOpenIndex.set(null);
        this.mostrarForm.set(true);
    }

    cerrarForm(): void {
        this.mostrarForm.set(false);
        this.lookupOpenIndex.set(null);
    }

    tiendasArray(lineaIndex: number): FormArray {
        return this.lineasArray.at(lineaIndex).get('tiendas') as FormArray;
    }

    addLinea(): void {
        this.lineasArray.push(this.createLineaFormGroup());
    }

    removeLinea(index: number): void {
        if (this.lineasArray.length > 1) this.lineasArray.removeAt(index);
        if (this.lookupOpenIndex() === index) this.lookupOpenIndex.set(null);
    }

    /** Abre/cierra el mini-panel de búsqueda de producto de la línea `index`. */
    toggleLookup(index: number): void {
        this.lookupOpenIndex.set(this.lookupOpenIndex() === index ? null : index);
    }

    /** Aplica el producto elegido en `<app-product-lookup>` a la línea `index` (SKU queda manual: ProductResponse no lo trae). */
    onProductoSeleccionado(index: number, product: ProductResponse): void {
        const linea = this.lineasArray.at(index) as FormGroup;
        linea.patchValue({ productoId: productIdToUuid(product.id), productoNombre: product.nombre });
        this.lookupOpenIndex.set(null);
    }

    /** Al elegir una sucursal en el select de tienda, autocompleta `storeNombre` en la misma fila. */
    onStoreChange(lineaIndex: number, tiendaIndex: number, event: Event): void {
        const id = (event.target as HTMLSelectElement).value;
        const tienda = this.tiendasArray(lineaIndex).at(tiendaIndex) as FormGroup;
        const sucursal = this.sucursales().find(s => String(s.id) === id);
        tienda.patchValue({ storeId: id, storeNombre: sucursal?.nombre ?? '' });
    }

    addTienda(lineaIndex: number): void {
        this.tiendasArray(lineaIndex).push(this.createTiendaFormGroup());
    }

    removeTienda(lineaIndex: number, tiendaIndex: number): void {
        const tiendas = this.tiendasArray(lineaIndex);
        if (tiendas.length > 1) tiendas.removeAt(tiendaIndex);
    }

    crear(): void {
        if (this.form.invalid) return;
        this.guardando.set(true);
        const v = this.form.value as { descripcion?: string; lineas?: Record<string, unknown>[] };
        const lineas: LineaReq[] = (v.lineas ?? []).map((l) => ({
            productoId: l['productoId'] as string,
            sku: (l['sku'] as string) || undefined,
            productoNombre: l['productoNombre'] as string,
            unidadMedida: (l['unidadMedida'] as string) || 'UND',
            tiendas: ((l['tiendas'] as Record<string, unknown>[]) ?? []).map((t) => ({
                storeId: t['storeId'] as string,
                storeNombre: t['storeNombre'] as string,
                cantidad: Number(t['cantidad']),
            })),
        }));
        this.http.post<ConsolidacionDto>(this.baseUrl,
            { descripcion: v.descripcion, lineas },
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => { this.guardando.set(false); this.mostrarForm.set(false); this.cargar(); },
            error: () => { this.guardando.set(false); this.error.set('Error al crear la consolidación'); }
        });
    }

    abrirAsignarProveedor(consolidacionId: string, lineaId: string): void {
        this.proveedorForm.reset({ proveedorId: '', precioUnitario: 0 });
        this.asignandoConsolidacionId.set(consolidacionId);
        this.asignandoLineaId.set(lineaId);
    }

    cerrarAsignarProveedor(): void {
        this.asignandoConsolidacionId.set(null);
        this.asignandoLineaId.set(null);
    }

    asignarProveedor(): void {
        const consolidacionId = this.asignandoConsolidacionId();
        const lineaId = this.asignandoLineaId();
        if (!consolidacionId || !lineaId || this.proveedorForm.invalid) return;
        this.asignando.set(true);
        const { proveedorId, precioUnitario } = this.proveedorForm.value;
        this.http.put<ConsolidacionDto>(
            `${this.baseUrl}/${consolidacionId}/lineas/${lineaId}/proveedor`,
            { proveedorId, precioUnitario },
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => {
                this.asignando.set(false);
                this.cerrarAsignarProveedor();
                this.cargar();
            },
            error: () => { this.asignando.set(false); this.error.set('Error al asignar proveedor a la línea'); }
        });
    }

    cerrarSolicitud(id: string): void {
        this.http.put(`${this.baseUrl}/${id}/cerrar`, {}, { headers: this.getHeaders() }).subscribe({
            next: () => this.cargar(),
            error: () => this.error.set('Error al cerrar solicitud')
        });
    }

    estadoClass(estado: string): string {
        const m: Record<string, string> = {
            ABIERTA: 'badge-accent',
            EN_PROCESO: 'badge-warning',
            CERRADA: 'badge-success',
        };
        return m[estado] ?? 'badge-neutral';
    }

    private createLineaFormGroup(): FormGroup {
        return this.fb.group({
            productoId: ['', Validators.required],
            sku: [''],
            productoNombre: ['', Validators.required],
            unidadMedida: ['UND'],
            tiendas: this.fb.array([this.createTiendaFormGroup()]),
        });
    }

    private createTiendaFormGroup(): FormGroup {
        return this.fb.group({
            storeId: ['', Validators.required],
            storeNombre: ['', Validators.required],
            cantidad: [1, [Validators.required, Validators.min(1)]],
        });
    }
}
