import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { UserService } from '@features/admin/services/user.service';
import { RolService } from '@features/admin/services/rol.service';
import { UserListComponent } from '@features/admin/pages/users/components/user-list/user-list.component';
import { UserFormComponent } from '@features/admin/pages/users/components/user-form/user-form.component';
import { ChangeDetectionStrategy } from '@angular/core';
import {
  UserResponse,
  UserRequest,
  RolDto,
  TIPO_DOCUMENTO_OPTIONS
} from '@features/admin/models/user.model';
import { PaginationConfig, PageResponse } from '@features/admin/models/product.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UserListComponent, UserFormComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly rolService = inject(RolService);
  private readonly fb = inject(FormBuilder);

  // Signals for reactive state
  users = signal<UserResponse[]>([]);
  roles = signal<RolDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Pagination state
  currentPage = signal(0);
  pageSize = signal(10);
  totalElements = signal(0);
  totalPages = signal(0);

  // Filter and sort state
  searchQuery = signal('');
  filterRolId = signal<number | null>(null);
  sortField = signal('id');
  sortDirection = signal<'asc' | 'desc'>('asc');

  // Modal state
  showModal = signal(false);
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
  pages = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i);
  });

  // Constants
  tipoDocumentoOptions = TIPO_DOCUMENTO_OPTIONS;

  constructor() {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
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

    this.userService.getAll(pagination).subscribe({
      next: (response: PageResponse<UserResponse>) => {
        this.users.set(response.content);
        this.totalElements.set(response.page.totalElements);
        this.totalPages.set(response.page.totalPages);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(0);
    this.loadUsers();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadUsers();
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(parseInt(select.value, 10));
    this.currentPage.set(0);
    this.loadUsers();
  }

  openCreateModal(): void {
    this.editMode.set(false);
    this.selectedUserId.set(null);
    this.userForm.reset({ tipoDocumento: 'DNI' });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.showModal.set(true);
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

    this.showModal.set(true);
    this.submitError.set(null);
  }

  closeModal(): void {
    this.showModal.set(false);
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
