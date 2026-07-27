import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { UserService } from '@features/admin/services/user.service';
import { RolService } from '@features/admin/services/rol.service';
import { UserFormComponent } from '@features/admin/pages/users/components/user-form/user-form.component';
import { ButtonComponent } from '@shared/components';
import { CatalogService } from '@core/services/catalog.service';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
  SortEvent,
  FilterConfig,
  FilterChangeEvent,
  PaginationEvent,
  DateRangeFilterConfig,
  DateRangeChangeEvent
} from '@shared/ui/tables/data-table/data-table.component';
import { catalogFilter, signalFilter, staticFilter, ACTIVO_OPTIONS } from '@shared/ui/tables/data-table/filter-helpers';
import {
  UserResponse,
  UserRequest,
  UserFilter,
  RolDto,
  TIPO_DOCUMENTO_OPTIONS
} from '@features/admin/models/user.model';
import { PaginationConfig, PageResponse, pageTotalElements, pageTotalPages } from '@core/models/pagination.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent, UserFormComponent, ButtonComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly rolService = inject(RolService);
  private readonly fb = inject(FormBuilder);
  readonly catalog = inject(CatalogService);

  // Signals for reactive state
  users = signal<UserResponse[]>([]);
  roles = signal<RolDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Pagination state
  currentPage = signal(0);
  pageSize = signal(20);
  totalElements = signal(0);
  totalPages = signal(0);

  // Filter and sort state (TODO server-side — la vista nunca filtra la página cargada)
  searchQuery = signal('');
  filterRolId = signal('');
  filterActivo = signal('');
  filterTipoDocumento = signal('');
  filterFechaCreacionDesde = signal<string | null>(null);
  filterFechaCreacionHasta = signal<string | null>(null);
  sortField = signal('id');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Drawer state
  showDrawer = signal(false);
  editMode = signal(false);
  selectedUserId = signal<number | null>(null);

  // Form submission state
  submitting = signal(false);
  submitError = signal<string | null>(null);

  // User form with validations
  userForm: FormGroup;

  // Computed values
  hasUsers = computed(() => this.users().length > 0);
  isEmpty = computed(() => !this.loading() && !this.hasUsers());

  // Constants
  tipoDocumentoOptions = TIPO_DOCUMENTO_OPTIONS;

  // Filtros select del toolbar. Las opciones salen de erp_parameters / roles cargados.
  filters: FilterConfig[] = [
    signalFilter('rolId', 'Todos los roles', this.roles, r => ({ value: r.id, label: r.nombre })),
    staticFilter('activo', 'Estado', ACTIVO_OPTIONS),
    catalogFilter(this.catalog, 'TIPO_DOCUMENTO_IDENTIDAD', 'tipoDocumento', 'Tipo de documento')
  ];

  /** Rango de fecha de creación para el toolbar del data-table. */
  dateRangeFilters: DateRangeFilterConfig[] = [
    { field: 'fechaCreacion', label: 'Fecha de creación' }
  ];

  columns: TableColumn<UserResponse>[] = [
    { key: 'id', label: 'ID', width: '60px' },
    { key: 'username', label: 'Usuario' },
    { key: 'nombreCompleto', label: 'Nombre Completo', render: (r) => r.persona.nombreCompleto },
    { key: 'email', label: 'Email' },
    {
      key: 'rol', label: 'Rol', html: true,
      render: (r) => `<span class="badge badge-neutral">${r.rol.nombre}</span>`
    },
    {
      key: 'documento', label: 'Documento',
      render: (r) => `${r.persona.tipoDocumento}: ${r.persona.numeroDocumento}`
    },
    {
      key: 'activo', label: 'Estado', html: true,
      render: (r) => `<span class="badge badge-${r.activo ? 'success' : 'error'}">${r.activo ? 'Activo' : 'Inactivo'}</span>`
    }
  ];

  actions: TableAction<UserResponse>[] = [
    { label: 'Editar', icon: '✏️', class: 'btn-edit', onClick: (row) => this.openEditModal(row) },
    { label: 'Eliminar', icon: '🗑️', class: 'btn-delete', onClick: (row) => this.onDelete(row) }
  ];

  constructor() {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
      rolId: [null, [Validators.required]],
      nombres: ['', [Validators.required, Validators.maxLength(100)]],
      apellidos: ['', [Validators.required, Validators.maxLength(100)]],
      tipoDocumento: ['DNI', [Validators.required]],
      numeroDocumento: ['', [Validators.required, Validators.maxLength(15)]],
      fechaNacimiento: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  loadRoles(): void {
    this.rolService.getAll().subscribe({
      next: (roles) => this.roles.set(roles),
      error: (err) => console.error('Error loading roles:', err)
    });
  }

  loadUsers(): void {
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

    const filter: UserFilter = {
      search: this.searchQuery() || undefined,
      rolId: this.filterRolId() ? Number(this.filterRolId()) : undefined,
      activo: this.filterActivo() ? this.filterActivo() === 'true' : undefined,
      tipoDocumento: this.filterTipoDocumento() || undefined,
      fechaCreacionDesde: this.filterFechaCreacionDesde() ?? undefined,
      fechaCreacionHasta: this.filterFechaCreacionHasta() ?? undefined
    };

    this.userService.getAll(pagination, filter).subscribe({
      next: (response: PageResponse<UserResponse>) => {
        this.users.set(response?.content ?? []);
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

  /** La búsqueda por texto también va al backend, no filtra la página cargada. */
  onSearchTerm(term: string): void {
    this.searchQuery.set(term);
    this.currentPage.set(0);
    this.loadUsers();
  }

  onFilterChangeEvent(event: FilterChangeEvent): void {
    const valor = event.value != null ? String(event.value) : '';
    switch (event.field) {
      case 'rolId':         this.filterRolId.set(valor); break;
      case 'activo':        this.filterActivo.set(valor); break;
      case 'tipoDocumento':  this.filterTipoDocumento.set(valor); break;
      default: return;
    }
    this.currentPage.set(0);
    this.loadUsers();
  }

  onDateRangeChange(event: DateRangeChangeEvent): void {
    if (event.field === 'fechaCreacion') {
      this.filterFechaCreacionDesde.set(event.from);
      this.filterFechaCreacionHasta.set(event.to);
      this.currentPage.set(0);
      this.loadUsers();
    }
  }

  /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
  onFiltersClear(): void {
    this.searchQuery.set('');
    this.filterRolId.set('');
    this.filterActivo.set('');
    this.filterTipoDocumento.set('');
    this.filterFechaCreacionDesde.set(null);
    this.filterFechaCreacionHasta.set(null);
    this.currentPage.set(0);
    this.loadUsers();
  }

  onSort(event: SortEvent): void {
    this.sortField.set(event.field);
    this.sortDirection.set(event.direction);
    this.currentPage.set(0);
    this.loadUsers();
  }

  onPaginationChange(event: PaginationEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.size);
    this.loadUsers();
  }

  openCreateModal(): void {
    this.editMode.set(false);
    this.selectedUserId.set(null);
    this.userForm.reset({ tipoDocumento: 'DNI' });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.showDrawer.set(true);
    this.submitError.set(null);
  }

  openEditModal(user: UserResponse): void {
    this.editMode.set(true);
    this.selectedUserId.set(user.id);

    this.userForm.patchValue({
      username: user.username,
      email: user.email,
      password: '',
      rolId: user.rol.id,
      nombres: user.persona.nombres,
      apellidos: user.persona.apellidos,
      tipoDocumento: user.persona.tipoDocumento,
      numeroDocumento: user.persona.numeroDocumento,
      fechaNacimiento: user.persona.fechaNacimiento
    });

    // Password is optional on edit
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();

    this.showDrawer.set(true);
    this.submitError.set(null);
  }

  closeModal(): void {
    this.showDrawer.set(false);
    this.userForm.reset();
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const formValue = this.userForm.value;
    const userRequest: UserRequest = {
      username: formValue.username,
      email: formValue.email,
      password: formValue.password || '',
      rolId: formValue.rolId,
      nombres: formValue.nombres,
      apellidos: formValue.apellidos,
      tipoDocumento: formValue.tipoDocumento,
      numeroDocumento: formValue.numeroDocumento,
      fechaNacimiento: formValue.fechaNacimiento
    };

    const operation = this.editMode()
      ? this.userService.update(this.selectedUserId()!, userRequest)
      : this.userService.create(userRequest);

    operation.subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeModal();
        this.loadUsers();
      },
      error: (err: Error) => {
        this.submitError.set(err.message);
        this.submitting.set(false);
      }
    });
  }

  onDelete(user: UserResponse): void {
    if (!confirm(`¿Está seguro de eliminar el usuario "${user.username}"?`)) {
      return;
    }

    this.loading.set(true);
    this.userService.delete(user.id).subscribe({
      next: () => this.loadUsers(),
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.userForm.get(controlName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['email']) return 'Email inválido';
    if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    if (control.errors['maxlength']) return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;

    return 'Campo inválido';
  }

  hasError(controlName: string): boolean {
    const control = this.userForm.get(controlName);
    return !!(control && control.invalid && control.touched);
  }
}
