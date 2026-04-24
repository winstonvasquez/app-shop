import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { CategoryService } from '@core/services/category.service';
import {
  CategoryResponse,
  CategoryRequest,
  CategoryFilter
} from '@core/models/category.model';
import { PaginationConfig, PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent, SortEvent } from '@shared/ui/tables/data-table/data-table.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { ButtonComponent } from '@shared/components';

@Component({
  selector: 'app-categories',
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
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss'
})
export class CategoriesComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly fb = inject(FormBuilder);

  // Signals for reactive state
  categories = signal<CategoryResponse[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Pagination state
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);
  totalPages = signal(0);

  // Filter and sort state
  searchQuery = signal('');
  filterLevel = signal<number | null>(null);
  sortField = signal('nombre');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Modal state
  showModal = signal(false);
  editMode = signal(false);
  selectedCategoryId = signal<number | null>(null);

  // Form submission state
  submitting = signal(false);
  submitError = signal<string | null>(null);

  // Category form with validations
  categoryForm: FormGroup;

  private readonly searchInput$ = new Subject<string>();

  // Breadcrumbs
  breadcrumbs: Breadcrumb[] = [
    { label: 'Admin', url: '/admin' },
    { label: 'Categorías' }
  ];

  // Table columns configuration
  columns: TableColumn<CategoryResponse>[] = [
    { key: 'id', label: 'ID', sortable: true, width: '80px' },
    { key: 'nombre', label: 'Nombre', sortable: true },
    {
      key: 'descripcion',
      label: 'Descripción',
      render: (row) => row.descripcion || '-'
    },
    {
      key: 'nivel',
      label: 'Nivel',
      sortable: true,
      width: '100px',
      align: 'center'
    },
    {
      key: 'imagenUrl',
      label: 'Imagen',
      render: (row) => row.imagenUrl ? '✓' : '-',
      align: 'center'
    }
  ];

  // Table actions configuration
  actions: TableAction<CategoryResponse>[] = [
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

  // Level options for filter and form
  levelOptions = [
    { value: 0, label: 'Nivel 0 - Raíz' },
    { value: 1, label: 'Nivel 1' },
    { value: 2, label: 'Nivel 2' },
    { value: 3, label: 'Nivel 3' }
  ];

  constructor() {
    this.categoryForm = this.fb.group({
      nombre: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]],
      descripcion: ['', [
        Validators.maxLength(500)
      ]],
      imagenUrl: ['', [
        Validators.maxLength(512),
        Validators.pattern(/^https?:\/\/.+/)
      ]],
      nivel: [0, [
        Validators.required,
        Validators.min(0),
        Validators.max(10)
      ]]
    });

    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(value => {
        this.searchQuery.set(value);
        this.currentPage.set(0);
        this.loadCategories();
      });
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  /**
   * Load categories with current pagination and filters
   */
  loadCategories(): void {
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

    const filter: CategoryFilter = {
      search: this.searchQuery() || undefined,
      nivel: this.filterLevel() ?? undefined
    };

    this.categoryService.getAll(pagination, filter).subscribe({
      next: (response: PageResponse<CategoryResponse>) => {
        this.categories.set(response.content);
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
   * Handle search input (debounced 300ms via searchInput$)
   */
  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchInput$.next(input.value);
  }

  /**
   * Handle level filter change
   */
  onLevelFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    this.filterLevel.set(value === '' ? null : parseInt(value, 10));
    this.currentPage.set(0);
    this.loadCategories();
  }

  /**
   * Handle page change from DataTable or pagination controls
   */
  onPageChange(event: PaginationEvent | number): void {
    if (typeof event === 'number') {
      this.currentPage.set(event);
    } else {
      this.currentPage.set(event.page);
      this.pageSize.set(event.size);
    }
    this.loadCategories();
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(parseInt(select.value, 10));
    this.currentPage.set(0);
    this.loadCategories();
  }

  /**
   * Handle column sort from DataTable
   */
  onSort(event: SortEvent): void {
    this.sortField.set(event.field);
    this.sortDirection.set(event.direction);
    this.currentPage.set(0);
    this.loadCategories();
  }

  /**
   * Open modal for creating new category
   */
  openCreateModal(): void {
    this.editMode.set(false);
    this.selectedCategoryId.set(null);
    this.categoryForm.reset({
      nivel: 0
    });
    this.showModal.set(true);
    this.submitError.set(null);
  }

  /**
   * Open modal for editing category
   */
  openEditModal(category: CategoryResponse): void {
    this.editMode.set(true);
    this.selectedCategoryId.set(category.id);

    this.categoryForm.patchValue({
      nombre: category.nombre,
      descripcion: category.descripcion,
      imagenUrl: category.imagenUrl,
      nivel: category.nivel
    });

    this.showModal.set(true);
    this.submitError.set(null);
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.showModal.set(false);
    this.categoryForm.reset();
  }

  /**
   * Submit form (create or update)
   */
  onSubmit(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const formValue = this.categoryForm.value;
    const categoryRequest: CategoryRequest = {
      nombre: formValue.nombre,
      descripcion: formValue.descripcion || null,
      imagenUrl: formValue.imagenUrl || null,
      nivel: formValue.nivel
    };

    const operation = this.editMode()
      ? this.categoryService.update(this.selectedCategoryId()!, categoryRequest)
      : this.categoryService.create(categoryRequest);

    operation.subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeModal();
        this.loadCategories();
      },
      error: (err: Error) => {
        this.submitError.set(err.message);
        this.submitting.set(false);
      }
    });
  }

  /**
   * Delete category
   */
  onDelete(category: CategoryResponse): void {
    if (!confirm(`¿Está seguro de eliminar la categoría "${category.nombre}"?`)) {
      return;
    }

    this.loading.set(true);
    this.categoryService.delete(category.id).subscribe({
      next: () => {
        this.loadCategories();
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  hasCategories = computed(() => this.categories().length > 0);
  isEmpty = computed(() => !this.loading() && !this.hasCategories());
  pages = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i);
  });

  /**
   * Get level badge class
   */
  getLevelBadgeClass(nivel: number): string {
    const classes = ['level-0', 'level-1', 'level-2', 'level-3'];
    return classes[nivel] || 'level-default';
  }

  /**
   * Get FormControl for FormFieldComponent
   */
  getControl(name: string): FormControl {
    return this.categoryForm.get(name) as FormControl;
  }
}
