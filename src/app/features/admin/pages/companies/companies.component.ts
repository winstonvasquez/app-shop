import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { CompanyService } from '@features/admin/services/company.service';
import {
  CompanyResponse,
  CompanyRequest,
  CompanyFilter
} from '@features/admin/models/company.model';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';

@Component({
  selector: 'app-companies',
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
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss'
})
export class CompaniesComponent implements OnInit {
  private readonly companyService = inject(CompanyService);
  private readonly fb = inject(FormBuilder);

  // Signals for reactive state
  allCompanies = signal<CompanyResponse[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filter state
  searchQuery = signal('');
  filterActive = signal<boolean | null>(null);

  // Modal state
  showModal = signal(false);
  editMode = signal(false);
  selectedCompanyId = signal<number | null>(null);

  // Form submission state
  submitting = signal(false);
  submitError = signal<string | null>(null);

  // Company form with validations
  companyForm: FormGroup;

  // Computed values - filtered companies
  companies = computed(() => {
    let filtered = this.allCompanies();

    // Apply search filter
    const search = this.searchQuery().toLowerCase();
    if (search) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(search) ||
        c.ruc.includes(search)
      );
    }

    // Apply active filter
    const activeFilter = this.filterActive();
    if (activeFilter !== null) {
      filtered = filtered.filter(c => c.isActive === activeFilter);
    }

    return filtered;
  });

  hasCompanies = computed(() => this.companies().length > 0);
  isEmpty = computed(() => !this.loading() && !this.hasCompanies());
  totalCompanies = computed(() => this.allCompanies().length);
  filteredCount = computed(() => this.companies().length);

  // Breadcrumbs
  breadcrumbs: Breadcrumb[] = [
    { label: 'Admin', url: '/admin' },
    { label: 'Empresas' }
  ];

  // Table columns configuration
  columns: TableColumn<CompanyResponse>[] = [
    { key: 'id', label: 'ID', sortable: true, width: '80px' },
    { key: 'name', label: 'Nombre', sortable: true },
    { key: 'ruc', label: 'RUC', sortable: true, width: '150px' },
    {
      key: 'isActive',
      label: 'Estado',
      sortable: true,
      width: '120px',
      align: 'center',
      render: (row) => row.isActive ? 'Activo' : 'Inactivo'
    }
  ];

  // Table actions configuration
  actions: TableAction<CompanyResponse>[] = [
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
    this.companyForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.maxLength(100)
      ]],
      ruc: ['', [
        Validators.required,
        Validators.maxLength(20),
        Validators.pattern(/^[0-9]+$/)
      ]],
      active: [true, [
        Validators.required
      ]]
    });
  }

  /**
   * Get FormControl for FormFieldComponent
   */
  getControl(name: string): FormControl {
    return this.companyForm.get(name) as FormControl;
  }

  ngOnInit(): void {
    this.loadCompanies();
  }

  /**
   * Load all companies
   */
  loadCompanies(): void {
    this.loading.set(true);
    this.error.set(null);

    this.companyService.getAll().subscribe({
      next: (companies: CompanyResponse[]) => {
        this.allCompanies.set(companies);
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
  }

  /**
   * Handle active filter change
   */
  onActiveFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    this.filterActive.set(value === '' ? null : value === 'true');
  }

  /**
   * Open modal for creating new company
   */
  openCreateModal(): void {
    this.editMode.set(false);
    this.selectedCompanyId.set(null);
    this.companyForm.reset({
      active: true
    });
    this.showModal.set(true);
    this.submitError.set(null);
  }

  /**
   * Open modal for editing company
   */
  openEditModal(company: CompanyResponse): void {
    this.editMode.set(true);
    this.selectedCompanyId.set(company.id);

    this.companyForm.patchValue({
      name: company.name,
      ruc: company.ruc,
      active: company.isActive
    });

    this.showModal.set(true);
    this.submitError.set(null);
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.showModal.set(false);
    this.companyForm.reset();
  }

  /**
   * Submit form (create or update)
   */
  onSubmit(): void {
    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const formValue = this.companyForm.value;
    const companyRequest: CompanyRequest = {
      name: formValue.name,
      ruc: formValue.ruc,
      active: formValue.active
    };

    const operation = this.editMode()
      ? this.companyService.update(this.selectedCompanyId()!, companyRequest)
      : this.companyService.create(companyRequest);

    operation.subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeModal();
        this.loadCompanies();
      },
      error: (err: Error) => {
        this.submitError.set(err.message);
        this.submitting.set(false);
      }
    });
  }

  /**
   * Delete company
   */
  onDelete(company: CompanyResponse): void {
    if (!confirm(`¿Está seguro de eliminar la empresa "${company.name}"?`)) {
      return;
    }

    this.loading.set(true);
    this.companyService.delete(company.id).subscribe({
      next: () => {
        this.loadCompanies();
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  /**
   * Toggle company active status
   */
  toggleActive(company: CompanyResponse): void {
    const updatedCompany: CompanyRequest = {
      name: company.name,
      ruc: company.ruc,
      active: !company.isActive
    };

    this.companyService.update(company.id, updatedCompany).subscribe({
      next: () => {
        this.loadCompanies();
      },
      error: (err: Error) => {
        this.error.set(err.message);
      }
    });
  }

  /**
   * Get form control error message
   */
  getErrorMessage(controlName: string): string {
    const control = this.companyForm.get(controlName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio';
    }
    if (control.errors['maxlength']) {
      return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
    }
    if (control.errors['pattern']) {
      return 'Solo se permiten números';
    }

    return 'Campo inválido';
  }

  /**
   * Check if form control has error
   */
  hasError(controlName: string): boolean {
    const control = this.companyForm.get(controlName);
    return !!(control && control.invalid && control.touched);
  }
}
