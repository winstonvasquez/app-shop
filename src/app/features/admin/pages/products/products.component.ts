import { Component, OnInit, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { ProductService, ProductRequest, ProductFilter } from '@core/services/product.service';
import { ProductResponse } from '@core/models/product.model';
import { PaginationConfig, PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent, SortEvent, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
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
    ButtonComponent
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {
  private readonly productService = inject(ProductService);
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

  // Filtro de categoría en el toolbar del data-table
  readonly categoriaFilters: FilterConfig[] = [
    {
      field: 'categoriaId', label: 'Todas las categorías',
      options: this.categoryService.getAllSimple().pipe(
        map(cats => cats.map(c => ({ value: c.id, label: c.nombre })))
      )
    }
  ];

  readonly dateRangeFilters: DateRangeFilterConfig[] = [
    { field: 'fechaCreacion', label: 'Fecha de creación' }
  ];

  /**
   * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
   * (respeta el filtro de búsqueda actual). Ver /sales/api/v1/productos/export.
   */
  readonly exportConfig: BackendExportConfig = {
    url: `${environment.apiUrls.sales}/api/v1/productos/export`,
    filename: 'productos',
    params: () => ({
      search: this.searchQuery(),
      categoriaId: this.filterCategoriaId() ?? undefined,
      fechaCreacionDesde: this.filterFechaCreacionDesde(),
      fechaCreacionHasta: this.filterFechaCreacionHasta(),
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
      fechaCreacionHasta: this.filterFechaCreacionHasta()
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
   * Handle filter change emitted by the data-table toolbar (categoría)
   */
  onFilterChangeEvent(event: FilterChangeEvent): void {
    if (event.field !== 'categoriaId') return;
    this.filterCategoriaId.set(event.value != null ? Number(event.value) : null);
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
      next: () => {
        this.submitting.set(false);
        this.closeModal();
        this.loadProducts();
      },
      error: (err: Error) => {
        this.submitError.set(err.message);
        this.submitting.set(false);
      }
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
