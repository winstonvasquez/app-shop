import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { richTextMaxLength } from '@core/utils/rich-text.util';
import { ProductService, ProductRequest, ProductFilter, ProductoImagen } from '@core/services/product.service';
import { ProductResponse } from '@core/models/product.model';
import { PaginationConfig, PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent, SortEvent, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { signalFilter, staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import {
  ButtonComponent, RichTextEditorComponent, MultiCheckSelectComponent, MultiCheckOption,
  ImageGalleryManagerComponent, PendingImage,
} from '@shared/components';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { CategoryService } from '@core/services/category.service';
import { CategoryResponse } from '@core/models/category.model';

/** Bucket de precio para el select del toolbar -> se traduce a precioMin/precioMax al filtrar. */
const PRECIO_RANGO_OPTIONS = [
  { value: '0-50',   label: 'Hasta S/ 50' },
  { value: '50-100',  label: 'S/ 50 - 100' },
  { value: '100-300', label: 'S/ 100 - 300' },
  { value: '300-',    label: 'Más de S/ 300' },
] as const;

const MIN_RATING_OPTIONS = [
  { value: '4', label: '4+ estrellas' },
  { value: '3', label: '3+ estrellas' },
  { value: '2', label: '2+ estrellas' },
  { value: '1', label: '1+ estrellas' },
] as const;

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    
    ReactiveFormsModule,
    DataTableComponent,
    FormFieldComponent,
    DrawerComponent,
    PageHeaderComponent,
    AlertComponent,
    ButtonComponent,
    RichTextEditorComponent,
    MultiCheckSelectComponent,
    ImageGalleryManagerComponent
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit, OnDestroy {
  private readonly productService = inject(ProductService);

  /** Imágenes ya guardadas del producto en edición (binarios en base de datos). */
  readonly imagenes = signal<ProductoImagen[]>([]);
  /** Imágenes elegidas en el drawer, pendientes de subir tras guardar. */
  readonly imagenesPendientes = signal<PendingImage[]>([]);
  readonly imagenesError = signal<string | null>(null);
  /**
   * ¿Sabemos cuáles son las categorías REALES del producto en edición? Si no, el
   * submit NO debe mandar `categoriaIds`: el backend interpreta la lista vacía como
   * «quítalas todas» y borraría las que tuviera.
   */
  readonly categoriasCargadas = signal(false);
  /** Un PUT de reorden en vuelo: dos clics rápidos partirían del mismo estado. */
  readonly reordenando = signal(false);
  private contadorPendientes = 0;
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly categoryService = inject(CategoryService);

  categorias = signal<CategoryResponse[]>([]);

  /** Opciones del selector múltiple de categorías. */
  readonly categoriaOptions = computed<MultiCheckOption[]>(() =>
    this.categorias().map(c => ({ id: c.id, label: c.nombre })));

  // Signals for reactive state
  products = signal<ProductResponse[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Pagination state
  currentPage = signal(0);
  pageSize = signal(20);
  totalElements = signal(0);
  totalPages = signal(0);

  // Filter and sort state
  searchQuery = signal('');
  sortField = signal('nombre');
  sortDirection = signal<'asc' | 'desc'>('asc');
  filterCategoriaId = signal<number | null>(null);
  filterFechaCreacionDesde = signal<string | undefined>(undefined);
  filterFechaCreacionHasta = signal<string | undefined>(undefined);
  // Filtros nuevos: el backend ya los soporta (search/precioMin/Max/marca/minRating/activo) pero
  // la UI no los exponía todavía (ver ficha frontend-admin-ventas.md).
  filterMarca = signal('');
  filterActivo = signal('');
  filterPrecioMin = signal<number | undefined>(undefined);
  filterPrecioMax = signal<number | undefined>(undefined);
  filterMinRating = signal<number | undefined>(undefined);

  /** Marcas disponibles (GET /sales/api/v1/productos/filtros-disponibles) para el select de marca. */
  marcasFiltro = signal<string[]>([]);

  // Filtros del toolbar del data-table (categoría, marca, estado, precio y calificación).
  readonly filters: FilterConfig[] = [
    {
      field: 'categoriaId', label: 'Categoría',
      options: this.categoryService.getAllSimple().pipe(
        map(cats => cats.map(c => ({ value: c.id, label: c.nombre })))
      )
    },
    signalFilter('marca', 'Marca', this.marcasFiltro, m => ({ value: m, label: m })),
    staticFilter('activo', 'Estado', ACTIVO_OPTIONS),
    staticFilter('precioRango', 'Rango de precio', PRECIO_RANGO_OPTIONS),
    staticFilter('minRating', 'Calificación mínima', MIN_RATING_OPTIONS),
  ];

  readonly dateRangeFilters: DateRangeFilterConfig[] = [
    { field: 'fechaCreacion', label: 'Fecha de creación' }
  ];

  /**
   * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
   * (respeta TODOS los filtros actuales, no solo lo que se ve en pantalla). Ver /sales/api/v1/productos/export.
   */
  readonly exportConfig: BackendExportConfig = {
    url: `${environment.apiUrls.sales}/api/v1/productos/export`,
    filename: 'productos',
    params: () => ({
      search: this.searchQuery(),
      categoriaId: this.filterCategoriaId() ?? undefined,
      fechaCreacionDesde: this.filterFechaCreacionDesde(),
      fechaCreacionHasta: this.filterFechaCreacionHasta(),
      marca: this.filterMarca() || undefined,
      activo: this.filterActivo() || undefined,
      precioMin: this.filterPrecioMin(),
      precioMax: this.filterPrecioMax(),
      minRating: this.filterMinRating(),
    }),
  };

  // Modal state
  showModal = signal(false);
  editMode = signal(false);
  selectedProductId = signal<number | null>(null);

  // Form submission state
  submitting = signal(false);
  submitError = signal<string | null>(null);

  // Product form with validations
  productForm: FormGroup;


  // Breadcrumbs
  breadcrumbs: Breadcrumb[] = [
    { label: 'Admin', url: '/admin' },
    { label: 'Productos' }
  ];

  // Table columns configuration
  columns: TableColumn<ProductResponse>[] = [
    { key: 'id', label: 'ID', sortable: true, width: '80px' },
    { key: 'nombre', label: 'Nombre', sortable: true },
    {
      key: 'descripcion',
      label: 'Descripción',
      html: true,
      render: (row) => row.descripcion || '-'
    },
    {
      key: 'precioBase',
      label: 'Precio',
      sortable: true,
      align: 'right',
      render: (row) => `$${row.precioBase.toFixed(2)}`
    },
    {
      key: 'marca',
      label: 'Marca',
      render: (row) => row.marca || '-'
    },
    {
      key: 'company',
      label: 'Empresa',
      render: (row) => row.company?.name ?? '—'
    },
    {
      key: 'categorias',
      label: 'Categorías',
      render: (row) => row.categorias && row.categorias.length > 0
        ? row.categorias.map((c: { nombre: string }) => c.nombre).join(', ')
        : 'Sin categorías'
    }
  ];

  // Table actions configuration
  actions: TableAction<ProductResponse>[] = [
    {
      label: 'Editar',
      icon: '✏️',
      onClick: (row) => this.openEditModal(row),
      class: 'btn-edit'
    },
    {
      label: 'Eliminar',
      icon: '🗑️',
      onClick: (row) => this.onDelete(row),
      class: 'btn-delete'
    }
  ];

  constructor() {
    this.productForm = this.fb.group({
      nombre: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      // El editor de texto enriquecido guarda HTML: el límite mide el texto VISIBLE.
      descripcion: ['', [
        richTextMaxLength(500)
      ]],
      precioBase: [null, [
        Validators.required,
        Validators.min(0.01),
        Validators.max(999999.99)
      ]],
      marca: ['', [
        Validators.maxLength(50)
      ]],
      categoriaIds: [[] as number[]]
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    this.categoryService.getAllSimple().subscribe(categorias => this.categorias.set(categorias));
    this.productService.getFiltrosDisponibles().subscribe({
      next: (f) => this.marcasFiltro.set(f.marcas ?? []),
      error: () => this.marcasFiltro.set([])
    });
  }

  ngOnDestroy(): void {
    // Navegar fuera de la página con la cola cargada filtraría los blobs.
    this.limpiarPendientes();
  }

  // ── Galería de imágenes ────────────────────────────────────────────────

  /** Añade archivos a la cola de subida; el primero de todos queda como principal. */
  onImagenesElegidas(files: File[]): void {
    this.imagenesError.set(null);
    const nuevas = files.map(file => ({
      key: `p${++this.contadorPendientes}`,
      file,
      previewUrl: URL.createObjectURL(file),
      esPrincipal: false,
    }));
    const total = [...this.imagenesPendientes(), ...nuevas];
    // Sólo hay una principal en todo el conjunto: si ya hay guardadas, manda una de ésas.
    if (this.imagenes().length === 0 && !total.some(p => p.esPrincipal) && total.length > 0) {
      total[0] = { ...total[0], esPrincipal: true };
    }
    this.imagenesPendientes.set(total);
  }

  onQuitarPendiente(item: PendingImage): void {
    URL.revokeObjectURL(item.previewUrl);
    const resto = this.imagenesPendientes().filter(p => p.key !== item.key);
    // Si se quitó la principal y no hay ninguna guardada, promueve la primera que quede.
    if (item.esPrincipal && resto.length > 0 && this.imagenes().length === 0) {
      resto[0] = { ...resto[0], esPrincipal: true };
    }
    this.imagenesPendientes.set(resto);
  }

  /** Marca una pendiente como principal; desmarca el resto de pendientes. */
  onPendientePrincipal(item: PendingImage): void {
    this.imagenesPendientes.update(list =>
      list.map(p => ({ ...p, esPrincipal: p.key === item.key })));
    // Una guardada no puede seguir siendo principal si la elegida está por subir:
    // se resuelve al subirla (el backend desmarca las demás).
  }

  onMoverPendiente({ item, delta }: { item: PendingImage; delta: number }): void {
    const list = [...this.imagenesPendientes()];
    const from = list.findIndex(p => p.key === item.key);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to], list[from]];
    this.imagenesPendientes.set(list);
  }

  /** Persiste el nuevo orden de las imágenes YA guardadas. */
  onReordenarImagenes(imagenIds: number[]): void {
    const productoId = this.selectedProductId();
    if (!productoId) return;
    this.reordenando.set(true);
    this.productService.reordenarImagenes(productoId, imagenIds).subscribe({
      next: imgs => {
        this.imagenes.set(imgs ?? []);
        this.reordenando.set(false);
      },
      error: () => {
        this.imagenesError.set('No se pudo cambiar el orden de las imágenes.');
        this.reordenando.set(false);
      },
    });
  }

  /** Marca como principal una imagen ya guardada. */
  onMarcarPrincipal(imagen: ProductoImagen): void {
    const productoId = this.selectedProductId();
    if (!productoId) return;
    this.reordenando.set(true);
    this.productService.marcarImagenPrincipal(productoId, imagen.id).subscribe({
      next: imgs => {
        this.imagenes.set(imgs ?? []);
        this.reordenando.set(false);
      },
      error: () => {
        this.imagenesError.set('No se pudo marcar la imagen como principal.');
        this.reordenando.set(false);
      },
    });
  }

  /**
   * Load products with current pagination and filters
   */
  loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    const pagination: PaginationConfig = {
      page: this.currentPage(),
      size: this.pageSize(),
      sort: {
        field: this.sortField(),
        direction: this.sortDirection()
      }
    };

    const filter: ProductFilter = {
      search: this.searchQuery() || undefined,
      categoriaId: this.filterCategoriaId() ?? undefined,
      fechaCreacionDesde: this.filterFechaCreacionDesde(),
      fechaCreacionHasta: this.filterFechaCreacionHasta(),
      marcas: this.filterMarca() ? [this.filterMarca()] : undefined,
      activo: this.filterActivo() === '' ? undefined : this.filterActivo() === 'true',
      precioMin: this.filterPrecioMin(),
      precioMax: this.filterPrecioMax(),
      minRating: this.filterMinRating()
    };

    this.productService.getAllProductsFiltered(pagination, filter).subscribe({
      next: (response: PageResponse<ProductResponse>) => {
        this.products.set(response.content);
        this.totalElements.set(pageTotalElements(response));
        this.totalPages.set(pageTotalPages(response));
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  /**
   * Handle search term emitted by the data-table toolbar (Buscar/Enter)
   */
  onSearchTerm(term: string): void {
    this.searchQuery.set(term);
    this.currentPage.set(0);
    this.loadProducts();
  }

  /**
   * Handle page change from DataTable
   */
  onPageChange(event: PaginationEvent): void {
    this.currentPage.set(event.page);
    this.loadProducts();
  }

  /**
   * Handle filter change emitted by the data-table toolbar (categoría, marca, estado, precio, rating)
   */
  onFilterChangeEvent(event: FilterChangeEvent): void {
    const valor = event.value != null ? String(event.value) : '';
    switch (event.field) {
      case 'categoriaId': this.filterCategoriaId.set(event.value != null ? Number(event.value) : null); break;
      case 'marca':       this.filterMarca.set(valor); break;
      case 'activo':      this.filterActivo.set(valor); break;
      case 'precioRango': this.setPrecioRango(valor); break;
      case 'minRating':   this.filterMinRating.set(valor ? Number(valor) : undefined); break;
      default: return;
    }
    this.currentPage.set(0);
    this.loadProducts();
  }

  /** Traduce el bucket elegido ("50-100", "300-", ...) a precioMin/precioMax para el backend. */
  private setPrecioRango(bucket: string): void {
    if (!bucket) {
      this.filterPrecioMin.set(undefined);
      this.filterPrecioMax.set(undefined);
      return;
    }
    const [min, max] = bucket.split('-');
    this.filterPrecioMin.set(min ? Number(min) : undefined);
    this.filterPrecioMax.set(max ? Number(max) : undefined);
  }

  /** "Limpiar filtros": resetea TODOS los signals de filtro y recarga UNA sola vez. */
  onFiltersClear(): void {
    this.searchQuery.set('');
    this.filterCategoriaId.set(null);
    this.filterFechaCreacionDesde.set(undefined);
    this.filterFechaCreacionHasta.set(undefined);
    this.filterMarca.set('');
    this.filterActivo.set('');
    this.filterPrecioMin.set(undefined);
    this.filterPrecioMax.set(undefined);
    this.filterMinRating.set(undefined);
    this.currentPage.set(0);
    this.loadProducts();
  }

  /**
   * Handle date range filter change emitted by the data-table toolbar (fecha de creación)
   */
  onDateRangeChange(event: DateRangeChangeEvent): void {
    if (event.field !== 'fechaCreacion') return;
    this.filterFechaCreacionDesde.set(event.from ?? undefined);
    this.filterFechaCreacionHasta.set(event.to ?? undefined);
    this.currentPage.set(0);
    this.loadProducts();
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(parseInt(select.value, 10));
    this.currentPage.set(0);
    this.loadProducts();
  }

  /**
   * Handle column sort from DataTable
   */
  onSort(event: SortEvent): void {
    this.sortField.set(event.field);
    this.sortDirection.set(event.direction);
    this.currentPage.set(0);
    this.loadProducts();
  }

  /**
   * Open modal for creating new product
   */
  openCreateModal(): void {
    this.editMode.set(false);
    this.selectedProductId.set(null);
    this.productForm.reset({
      categoriaIds: []
    });
    this.categoriasCargadas.set(true); // en un alta, el formulario es la fuente de verdad
    this.limpiarPendientes();
    this.imagenes.set([]);
    this.showModal.set(true);
    this.submitError.set(null);
  }

  /**
   * Open modal for editing product
   */
  openEditModal(product: ProductResponse): void {
    this.editMode.set(true);
    this.selectedProductId.set(product.id);

    this.productForm.patchValue({
      nombre: product.nombre,
      descripcion: product.descripcion,
      precioBase: product.precioBase,
      marca: product.marca,
      categoriaIds: product.categorias?.map((c: { id: number }) => c.id) || []
    });

    // La fila de la tabla NO trae `categorias` (la proyección JPQL de la lista las
    // deja en null), así que hay que pedir el producto completo: sin esto el
    // selector abriría vacío y guardar le quitaría al producto sus categorías.
    this.categoriasCargadas.set(false);
    this.productService.getById(product.id).subscribe({
      next: completo => {
        this.productForm.patchValue({
          categoriaIds: completo.categorias?.map((c: { id: number }) => c.id) || [],
        });
        this.categoriasCargadas.set(true);
      },
      error: () => this.submitError.set(
        'No se pudieron cargar las categorías del producto: se guardarán sin cambios.'),
    });

    this.limpiarPendientes();
    this.cargarImagenes(product.id);
    this.showModal.set(true);
    this.submitError.set(null);
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.showModal.set(false);
    this.productForm.reset();
    // Sin esto, cancelar deja vivas las object URLs de la previsualización.
    this.limpiarPendientes();
  }

  /**
   * Submit form (create or update)
   */
  onSubmit(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const companyId = this.authService.currentUser()?.activeCompanyId ?? null;
    if (!companyId) {
      this.submitError.set('No se pudo determinar la empresa activa');
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const formValue = this.productForm.value;
    const productRequest: ProductRequest = {
      nombre: formValue.nombre,
      descripcion: formValue.descripcion || null,
      precioBase: formValue.precioBase,
      marca: formValue.marca || null,
      companyId,
      // `undefined` = «no toques las categorías» (el backend distingue null de []).
      categoriaIds: this.categoriasCargadas() ? (formValue.categoriaIds || []) : undefined
    };

    const operation = this.editMode()
      ? this.productService.update(this.selectedProductId()!, productRequest)
      : this.productService.create(productRequest);

    operation.subscribe({
      next: (producto) => {
        // Las imágenes se suben después: el POST multipart necesita el id del producto.
        const id = this.editMode() ? this.selectedProductId()! : producto?.id;
        const pendientes = this.imagenesPendientes();
        if (pendientes.length > 0 && id) {
          this.subirPendientes(id, pendientes);
          return;
        }
        this.finalizarGuardado();
      },
      error: (err: Error) => {
        this.submitError.set(err.message);
        this.submitting.set(false);
      }
    });
  }

  /**
   * Sube la cola en SERIE y respetando el orden de la lista: el backend asigna
   * `orden` incremental, así que en paralelo llegarían desordenadas.
   */
  private subirPendientes(productoId: number, pendientes: PendingImage[]): void {
    // `orden` arranca DESPUÉS del mayor ya guardado: usar la cantidad de imágenes
    // daría un `orden` repetido en cuanto las guardadas se hayan reordenado.
    const ordenBase = this.imagenes().reduce((max, img) => Math.max(max, img.orden ?? 0), -1) + 1;
    const sinPrincipalGuardada = !this.imagenes().some(img => img.esPrincipal);
    const alguna = pendientes.some(x => x.esPrincipal);

    const subir = (i: number): void => {
      if (i >= pendientes.length) {
        this.finalizarGuardado();
        return;
      }
      const p = pendientes[i];
      const principal = p.esPrincipal || (sinPrincipalGuardada && i === 0 && !alguna);
      this.productService.subirImagen(productoId, p.file, principal, ordenBase + i).subscribe({
        next: () => {
          // Se saca de la cola en cuanto sube: si una posterior falla y el usuario
          // reintenta, las ya subidas NO se vuelven a enviar duplicadas.
          this.imagenesPendientes.update(list => list.filter(x => x.key !== p.key));
          URL.revokeObjectURL(p.previewUrl);
          subir(i + 1);
        },
        error: () => {
          const restantes = pendientes.length - i;
          this.submitError.set(
            `El producto se guardó, pero falló la subida de ${restantes} imagen(es). Corrige y vuelve a guardar.`);
          // Refresca lo que sí entró para que el siguiente intento parta del estado real.
          this.cargarImagenes(productoId);
          this.submitting.set(false);
        },
      });
    };
    subir(0);
  }

  /** Cierra el drawer y refresca la lista tras un guardado correcto. */
  private finalizarGuardado(): void {
    this.limpiarPendientes();
    this.submitting.set(false);
    this.closeModal();
    this.loadProducts();
  }

  /** Vacía la cola y libera las object URLs de la previsualización. */
  private limpiarPendientes(): void {
    this.imagenesPendientes().forEach(p => URL.revokeObjectURL(p.previewUrl));
    this.imagenesPendientes.set([]);
    this.imagenesError.set(null);
  }

  /** Carga los metadatos de las imágenes del producto que se está editando. */
  private cargarImagenes(productoId: number): void {
    this.productService.getImagenes(productoId).subscribe({
      next: imgs => this.imagenes.set(imgs ?? []),
      error: () => this.imagenes.set([]),
    });
  }

  /** Elimina una imagen ya guardada del producto. */
  onEliminarImagen(imagen: ProductoImagen): void {
    const productoId = this.selectedProductId();
    if (!productoId) return;
    this.productService.eliminarImagen(productoId, imagen.id).subscribe({
      next: () => this.cargarImagenes(productoId),
      error: () => this.submitError.set('No se pudo eliminar la imagen.'),
    });
  }

  /**
   * Delete product
   */
  onDelete(product: ProductResponse): void {
    if (!confirm(`¿Está seguro de eliminar el producto "${product.nombre}"?`)) {
      return;
    }

    this.loading.set(true);
    this.productService.delete(product.id).subscribe({
      next: () => {
        this.loadProducts();
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  /**
   * Get FormControl for FormFieldComponent
   */
  getControl(name: string): FormControl {
    return this.productForm.get(name) as FormControl;
  }
}
