import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { CompanyService } from '@features/admin/services/company.service';
import {
  CompanyResponse,
  CompanyRequest,
} from '@features/admin/models/company.model';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { DataTableComponent, TableColumn, TableAction, FilterConfig, FilterChangeEvent, DateRangeFilterConfig, DateRangeChangeEvent } from '@shared/ui/tables/data-table/data-table.component';
import { staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import { BackendExportConfig } from '@shared/services/backend-export.service';
import { environment } from '@env/environment';
import {
  FormFieldComponent,
  AdminFormLayoutComponent,
  AdminFormSectionComponent,
  AlertComponent,
  PageHeaderComponent,
  Breadcrumb,
} from '@shared/ui';
import { ImageUploadComponent } from '@shared/ui/forms/image-upload/image-upload.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { ButtonComponent } from '@shared/components';
import { bloquearEnEdicion } from '@shared/utils/form-lock';

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
    AlertComponent,
    ButtonComponent,
    ImageUploadComponent
  ],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss'
})
export class CompaniesComponent implements OnInit {
  private readonly companyService = inject(CompanyService);

  /** Logotipo elegido en el drawer, pendiente de subir tras guardar. */
  readonly logoSeleccionado = signal<File | null>(null);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // Signals for reactive state — companies() es la página actual (server-side)
  companies = signal<CompanyResponse[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filter state
  searchQuery = signal('');
  filterActive = signal<boolean | null>(null);
  fechaCreacionDesde = signal<string | null>(null);
  fechaCreacionHasta = signal<string | null>(null);

  // Pagination (server-side)
  currentPage   = signal(0);
  pageSize      = signal(20);
  totalElements = signal(0);
  totalPages    = signal(0);

  // Modal state
  showModal = signal(false);
  editMode = signal(false);
  selectedCompanyId = signal<number | null>(null);

  // Form submission state
  submitting = signal(false);
  submitError = signal<string | null>(null);

  // Company form with validations
  companyForm: FormGroup;

  hasCompanies = computed(() => this.companies().length > 0);
  isEmpty = computed(() => !this.loading() && !this.hasCompanies());

  /**
   * Exportación SERVER-SIDE: el backend genera XLSX/CSV con datos limpios
   * (respeta los filtros actuales search + active). Ver /users/api/companies/export.
   */
  readonly exportConfig: BackendExportConfig = {
    url: `${environment.apiUrls.users}/api/companies/export`,
    filename: 'empresas',
    params: () => ({
      search: this.searchQuery(),
      active: this.filterActive() === null ? undefined : this.filterActive(),
      fechaCreacionDesde: this.fechaCreacionDesde() ?? undefined,
      fechaCreacionHasta: this.fechaCreacionHasta() ?? undefined
    }),
  };

  // Filtro de estado para el toolbar del data-table (isActive es boolean, no catálogo -> staticFilter)
  estadoFilters: FilterConfig[] = [
    staticFilter('active', 'Todos', ACTIVO_OPTIONS)
  ];

  // Filtro de rango de fecha de creación para el toolbar del data-table
  fechaCreacionFilters: DateRangeFilterConfig[] = [
    { field: 'fechaCreacion', label: 'Fecha de creación' }
  ];

  /**
   * Campos no editables tras el primer guardado: el `ruc` es la identidad tributaria del
   * tenant (todos los CPE emitidos lo referencian) y el `domain` es la clave con la que se
   * resuelve la empresa en el storefront (cambiarlo deja huérfanos los enlaces existentes).
   * Se muestran bloqueados, no ocultos.
   */
  private static readonly CAMPOS_BLOQUEADOS = ['ruc', 'domain'] as const;

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
    // Suspender/reactivar: la operación existía en el componente (`toggleActive`) pero NO estaba
    // cableada a ninguna acción, así que la única forma de suspender una empresa era el botón
    // «Eliminar» —que hace un soft delete pero no sabe reactivar— o entrar por SQL. El label sale del
    // estado de la fila para que la acción diga lo que va a hacer, no lo que la empresa es.
    {
      label: 'Suspender / Reactivar',
      icon: '⏸',
      onClick: (row) => this.confirmarCambioEstado(row),
      class: 'btn-icon'
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
   * Load current page server-side (search + active + 20/pág)
   */
  loadCompanies(): void {
    this.loading.set(true);
    this.error.set(null);

    this.companyService.getPaged(
      this.currentPage(),
      this.pageSize(),
      this.searchQuery() || undefined,
      this.filterActive(),
      this.fechaCreacionDesde(),
      this.fechaCreacionHasta()
    ).subscribe({
      next: (res) => {
        this.companies.set(res.content ?? []);
        this.totalElements.set(pageTotalElements(res));
        this.totalPages.set(pageTotalPages(res));
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
    this.loadCompanies();
  }

  /**
   * Handle filter change emitted by the data-table toolbar
   */
  onFilterChangeEvent(event: FilterChangeEvent): void {
    if (event.field === 'active') {
      this.filterActive.set(event.value == null ? null : String(event.value) === 'true');
      this.currentPage.set(0);
      this.loadCompanies();
    }
  }

  /**
   * Handle date-range filter change emitted by the data-table toolbar
   */
  onDateRangeChange(event: DateRangeChangeEvent): void {
    if (event.field === 'fechaCreacion') {
      this.fechaCreacionDesde.set(event.from);
      this.fechaCreacionHasta.set(event.to);
      this.currentPage.set(0);
      this.loadCompanies();
    }
  }

  /**
   * "Limpiar filtros": resetea todo y recarga UNA sola vez.
   */
  onFiltersClear(): void {
    this.searchQuery.set('');
    this.filterActive.set(null);
    this.fechaCreacionDesde.set(null);
    this.fechaCreacionHasta.set(null);
    this.currentPage.set(0);
    this.loadCompanies();
  }

  /**
   * Handle pagination change from the data-table
   */
  onPaginationChange(event: { page: number; size: number }): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.size);
    this.loadCompanies();
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
    bloquearEnEdicion(this.companyForm, CompaniesComponent.CAMPOS_BLOQUEADOS, false);
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
    bloquearEnEdicion(this.companyForm, CompaniesComponent.CAMPOS_BLOQUEADOS, true);

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

    // getRawValue(): ruc y domain quedan deshabilitados en edición y no saldrían en
    // form.value — se enviarían nulls y se borrarían del tenant.
    const formValue = this.companyForm.getRawValue();
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
      next: (empresa) => {
        // El logo se sube aparte: el POST multipart necesita el id de la empresa.
        const archivo = this.logoSeleccionado();
        const id = this.editMode() ? this.selectedCompanyId()! : empresa?.id;
        if (archivo && id) {
          this.companyService.subirLogo(id, archivo).subscribe({
            next: () => this.finalizarGuardado(),
            error: () => {
              this.submitError.set('La empresa se guardó, pero falló la subida del logotipo.');
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
    this.logoSeleccionado.set(null);
    this.submitting.set(false);
    this.closeModal();
    this.loadCompanies();
  }

  /** Quita el logotipo actual de la empresa (el backend borra el binario). */
  onQuitarLogo(): void {
    this.logoSeleccionado.set(null);
    const id = this.selectedCompanyId();
    this.companyForm.get('logoUrl')?.setValue('');
    if (!this.editMode() || !id) return;
    this.companyService.eliminarLogo(id).subscribe({
      error: () => this.submitError.set('No se pudo eliminar el logotipo.'),
    });
  }

  /**
   * Delete company
   */
  /**
   * Confirma y aplica la suspensión o reactivación de una empresa.
   *
   * Usa `confirm()` porque es el mecanismo que ya usa `onDelete` en esta misma pantalla y no merece la
   * pena introducir un segundo patrón de confirmación aquí. El texto dice lo que va a pasar de verdad:
   * suspender bloquea el login y el cambio de empresa, pero NO corta las sesiones ya emitidas —eso es
   * un pendiente conocido del proyecto (el JWT vive 24 h y ningún servicio consulta el estado de la
   * empresa por request), y ocultarlo aquí haría creer al operador que el corte es inmediato.
   */
  confirmarCambioEstado(company: CompanyResponse): void {
    const suspender = company.isActive;
    const mensaje = suspender
      ? `¿Suspender la empresa "${company.name}"?\n\n`
        + 'No podrá iniciar sesión ni cambiar de empresa. Las sesiones ya abiertas siguen siendo '
        + 'válidas hasta que expiren.'
      : `¿Reactivar la empresa "${company.name}"?`;

    if (!confirm(mensaje)) {
      return;
    }
    this.toggleActive(company);
  }

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
    // Antes esto armaba un CompanyRequest completo con el flag girado y lo mandaba por PUT. Dos
    // problemas: (1) el método no estaba cableado a ninguna acción de la tabla, así que la capacidad
    // existía y era inalcanzable desde la UI; (2) el backend sobrescribe ocho campos con lo que venga
    // en el DTO, así que girar el estado BORRABA cualquier campo que la fila de la lista no llevara —
    // en particular `domain`, del que depende la resolución de tenant del checkout de invitado.
    // Ahora usa el endpoint que sólo toca el estado.
    this.companyService.cambiarEstado(company.id, !company.isActive).subscribe({
      next: () => this.loadCompanies(),
      error: (err: Error) => this.error.set(err.message)
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
