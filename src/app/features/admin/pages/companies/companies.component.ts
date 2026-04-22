import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { CompanyService } from '@features/admin/services/company.service';
import {
  CompanyResponse,
  CompanyRequest,
} from '@features/admin/models/company.model';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import {
  FormFieldComponent,
  AdminFormLayoutComponent,
  AdminFormSectionComponent,
  AlertComponent,
  PageHeaderComponent,
  Breadcrumb,
} from '@shared/ui';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    FormFieldComponent,
    AdminFormLayoutComponent,
    AdminFormSectionComponent,
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
  private readonly router = inject(Router);

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
    { key: 'name', label: 'Nombre', sortable: true },
    { key: 'ruc', label: 'RUC', sortable: true, width: '140px' },
    { key: 'legalName', label: 'Razón Social', sortable: true, render: (row) => row.legalName ?? '—' },
    { key: 'email', label: 'Email', sortable: false, render: (row) => row.email ?? '—' },
    {
      key: 'isActive',
      label: 'Estado',
      sortable: true,
      width: '100px',
      align: 'center',
      render: (row) => row.isActive ? 'Activo' : 'Inactivo'
    }
  ];

  // Table actions configuration
  actions: TableAction<CompanyResponse>[] = [
    {
      label: 'Ver',
      icon: '👁',
      onClick: (row) => this.router.navigate(['/admin/companies', row.id]),
      class: 'btn-icon'
    },
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
      name: ['', [Validators.required, Validators.maxLength(100)]],
      ruc: ['', [Validators.required, Validators.pattern(/^[0-9]{11}$/)]],
      active: [true, [Validators.required]],
      legalName: ['', [Validators.maxLength(200)]],
      address: ['', [Validators.maxLength(300)]],
      phone: ['', [Validators.maxLength(20)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      logoUrl: ['', [Validators.maxLength(500)]],
      domain: ['', [Validators.maxLength(100)]]
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
      active: company.isActive,
      legalName: company.legalName ?? '',
      address: company.address ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
      logoUrl: company.logoUrl ?? '',
      domain: company.domain ?? ''
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
      active: formValue.active,
      legalName: formValue.legalName || undefined,
      address: formValue.address || undefined,
      phone: formValue.phone || undefined,
      email: formValue.email || undefined,
      logoUrl: formValue.logoUrl || undefined,
      domain: formValue.domain || undefined
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
      active: !company.isActive,
      legalName: company.legalName ?? undefined,
      address: company.address ?? undefined,
      phone: company.phone ?? undefined,
      email: company.email ?? undefined,
      logoUrl: company.logoUrl ?? undefined,
      domain: company.domain ?? undefined
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
   * Canonical error helper — returns human-readable error for a form control.
   */
  err(field: string): string {
    const c = this.companyForm.get(field);
    if (!c || c.pristine || c.valid) return '';
    if (c.hasError('required')) return 'Campo requerido';
    if (c.hasError('email')) return 'Email inválido';
    if (c.hasError('minlength')) return `Mínimo ${c.getError('minlength').requiredLength} caracteres`;
    if (c.hasError('maxlength')) return `Máximo ${c.getError('maxlength').requiredLength} caracteres`;
    if (c.hasError('pattern')) return 'Formato inválido';
    return 'Campo inválido';
  }
}
