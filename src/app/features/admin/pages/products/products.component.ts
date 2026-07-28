import { Component, OnInit, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { ProductService, ProductRequest, ProductFilter, ProductoImagen } from '@core/services/product.service';
import { ImageUploadComponent } from '@shared/ui/forms/image-upload/image-upload.component';
import { ProductResponse } from '@core/models/product.model';
import { PaginationConfig, PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent, SortEvent, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { signalFilter, staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent } from '@shared/components';
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
    ImageUploadComponent
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {
  private readonly productService = inject(ProductService);

  /** Imágenes ya guardadas del producto en edición (binarios en base de datos). */
  readonly imagenes = signal<ProductoImagen[]>([]);
  /** Imagen elegida en el drawer, pendiente de subir tras guardar. */
  readonly imagenSeleccionada = signal<File | null>(null);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly categoryService = inject(CategoryService);

  categorias = signal<CategoryResponse[]>([]);

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
      key: 'companyId',
      label: 'Empresa',
      render: (row) => `Empresa #${row.companyId}`
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
      descripcion: ['', [
        Validators.maxLength(500)
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

  toggleCategoria(id: number): void {
    const control = this.productForm.get('categoriaIds')!;
    const current: number[] = control.value || [];
    control.setValue(
      current.includes(id) ? current.filter(c => c !== id) : [...current, id]
    );
  }

  isCategoriaSelected(id: number): boolean {
    const current: number[] = this.productForm.get('categoriaIds')?.value || [];
    return current.includes(id);
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
    this.imagenSeleccionada.set(null);
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

    this.imagenSeleccionada.set(null);
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
      categoriaIds: formValue.categoriaIds || []
    };

    const operation = this.editMode()
      ? this.productService.update(this.selectedProductId()!, productRequest)
      : this.productService.create(productRequest);

    operation.subscribe({
      next: (producto) => {
        // La imagen se sube después: el POST multipart necesita el id del producto.
        const archivo = this.imagenSeleccionada();
        const id = this.editMode() ? this.selectedProductId()! : producto?.id;
        if (archivo && id) {
          const primera = this.imagenes().length === 0;
          this.productService.subirImagen(id, archivo, primera).subscribe({
            next: () => this.finalizarGuardado(),
            error: () => {
              this.submitError.set('El producto se guardó, pero falló la subida de la imagen.');
              this.submitting.set(false);
            },
          });
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

  /** Cierra el drawer y refresca la lista tras un guardado correcto. */
  private finalizarGuardado(): void {
    this.imagenSeleccionada.set(null);
    this.submitting.set(false);
    this.closeModal();
    this.loadProducts();
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
