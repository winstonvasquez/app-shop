import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { ProductService, ProductRequest, ProductFilter } from '@core/services/product.service';
import { ProductResponse } from '@core/models/product.model';
import { PaginationConfig, PageResponse } from '@core/models/pagination.model';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent, SortEvent } from '@shared/ui/tables/data-table/data-table.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DataTableComponent,
    FormFieldComponent,
    DrawerComponent,
    PageHeaderComponent,
    AlertComponent
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly fb = inject(FormBuilder);

  // Signals for reactive state
  products = signal<ProductResponse[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Pagination state
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);
  totalPages = signal(0);

  // Filter and sort state
  searchQuery = signal('');
  sortField = signal('nombre');
  sortDirection = signal<'asc' | 'desc'>('asc');

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
        ? row.categorias.map((c: any) => c.nombre).join(', ')
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
      companyId: [null, [
        Validators.required
      ]],
      categoriaIds: [[]]
    });
  }

  ngOnInit(): void {
    this.loadProducts();
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
      search: this.searchQuery() || undefined
    };

    this.productService.getAllProductsFiltered(pagination, filter).subscribe({
      next: (response: PageResponse<ProductResponse>) => {
        this.products.set(response.content);
        this.totalElements.set(response.totalElements);
        this.totalPages.set(response.totalPages);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  /**
   * Handle search input
   */
  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(0); // Reset to first page
    this.loadProducts();
  }

  /**
   * Handle page change from DataTable
   */
  onPageChange(event: PaginationEvent): void {
    this.currentPage.set(event.page);
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
      companyId: product.companyId,
      categoriaIds: product.categorias?.map((c: any) => c.id) || []
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

    this.submitting.set(true);
    this.submitError.set(null);

    const formValue = this.productForm.value;
    const productRequest: ProductRequest = {
      nombre: formValue.nombre,
      descripcion: formValue.descripcion || null,
      precioBase: formValue.precioBase,
      marca: formValue.marca || null,
      companyId: formValue.companyId,
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
