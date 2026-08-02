import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { LoginResponse } from '@core/auth/auth.model';

interface PersonaDto {
    id: number;
    nombres: string;
    apellidos: string;
    nombreCompleto: string;
    tipoDocumento: string;
    numeroDocumento: string;
    fechaNacimiento: string | null;
}

interface RolDto {
    id: number;
    nombre: string;
    descripcion: string | null;
}

interface UserResponseDto {
    id: number;
    username: string;
    email: string;
    activo: boolean;
    rol: RolDto | null;
    persona: PersonaDto | null;
    createdAt: string | null;
    updatedAt: string | null;
}

interface CompanyOption {
    companyId: number;
    companyName: string;
    ruc: string;
    isActive: boolean;
}

interface PermissionEntry {
    codigo: string;
    nombre: string;
    efecto: string;
}

interface MyPermissions {
    rolNombre: string;
    rolDescripcion: string;
    isStandardCustomer: boolean;
    permissions: PermissionEntry[];
}

@Component({
    selector: 'app-mi-perfil',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './mi-perfil.component.html',
    styleUrl: './mi-perfil.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiPerfilComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly http = inject(HttpClient);
    private readonly authService = inject(AuthService);
    private readonly baseUrl = `${environment.apiUrls.users}/api/users`;

    // --- Datos del usuario autenticado ---
    cargandoPerfil = signal(false);
    errorPerfil = signal('');
    perfil = signal<UserResponseDto | null>(null);

    // --- Cambio de contraseña ---
    guardandoPassword = signal(false);
    errorPassword = signal('');
    exitoPassword = signal('');
    verActual = signal(false);
    verNueva = signal(false);
    verConfirmar = signal(false);

    passwordForm = this.fb.group(
        {
            currentPassword: ['', Validators.required],
            newPassword: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', Validators.required],
        },
        { validators: this.passwordsMatchValidator() },
    );

    // --- Empresas / cambio de empresa activa ---
    cargandoEmpresas = signal(false);
    empresas = signal<CompanyOption[]>([]);
    cambiandoEmpresa = signal<number | null>(null);
    errorEmpresa = signal('');

    tieneVariasEmpresas = computed(() => this.empresas().length > 1);

    // --- Permisos (solo lectura) ---
    cargandoPermisos = signal(false);
    permisos = signal<MyPermissions | null>(null);

    userName = computed(() => this.authService.currentUser()?.username ?? '');
    activeCompanyId = computed(() => this.authService.currentUser()?.activeCompanyId ?? null);
    empresaActivaNombre = computed(() => {
        const id = this.activeCompanyId();
        const encontrada = this.empresas().find((e) => e.companyId === id);
        return encontrada?.companyName ?? (id != null ? String(id) : '—');
    });

    ngOnInit(): void {
        this.cargarPerfil();
        this.cargarEmpresas();
        this.cargarPermisos();
    }

    private cargarPerfil(): void {
        const userId = this.authService.currentUser()?.userId;
        if (!userId) {
            this.errorPerfil.set('No se pudo determinar el usuario autenticado.');
            return;
        }
        this.cargandoPerfil.set(true);
        this.errorPerfil.set('');
        this.http.get<UserResponseDto>(`${this.baseUrl}/${userId}`).subscribe({
            next: (data) => {
                this.perfil.set(data);
                this.cargandoPerfil.set(false);
            },
            error: () => {
                this.errorPerfil.set('No se pudo cargar la información del perfil.');
                this.cargandoPerfil.set(false);
            },
        });
    }

    private cargarEmpresas(): void {
        this.cargandoEmpresas.set(true);
        this.http.get<CompanyOption[]>(`${this.baseUrl}/me/companies`).subscribe({
            next: (data) => {
                this.empresas.set(data);
                this.cargandoEmpresas.set(false);
            },
            error: () => {
                this.empresas.set([]);
                this.cargandoEmpresas.set(false);
            },
        });
    }

    private cargarPermisos(): void {
        this.cargandoPermisos.set(true);
        this.http.get<MyPermissions>(`${this.baseUrl}/me/permissions`).subscribe({
            next: (data) => {
                this.permisos.set(data);
                this.cargandoPermisos.set(false);
            },
            error: () => {
                this.permisos.set(null);
                this.cargandoPermisos.set(false);
            },
        });
    }

    cambiarEmpresa(companyId: number): void {
        if (companyId === this.activeCompanyId() || this.cambiandoEmpresa() !== null) return;
        this.cambiandoEmpresa.set(companyId);
        this.errorEmpresa.set('');
        this.http.post<LoginResponse>(`${this.baseUrl}/me/companies/switch`, { targetCompanyId: companyId }).subscribe({
            next: (response) => {
                this.authService.setSessionFromResponse(response);
                this.cambiandoEmpresa.set(null);
                window.location.reload();
            },
            error: () => {
                this.cambiandoEmpresa.set(null);
                this.errorEmpresa.set('No se pudo cambiar de empresa. Intente nuevamente.');
            },
        });
    }

    errPassword(field: 'currentPassword' | 'newPassword' | 'confirmPassword'): string {
        const c = this.passwordForm.get(field);
        if (field === 'confirmPassword' && c?.touched && this.passwordForm.hasError('mismatch')) {
            return 'Las contraseñas no coinciden.';
        }
        if (!c || c.pristine || c.valid) return '';
        if (c.hasError('required')) return 'Campo obligatorio.';
        if (c.hasError('minlength')) return `Mínimo ${c.getError('minlength').requiredLength} caracteres.`;
        return 'Campo inválido.';
    }

    onSubmitPassword(): void {
        if (this.passwordForm.invalid) {
            this.passwordForm.markAllAsTouched();
            return;
        }
        this.guardandoPassword.set(true);
        this.errorPassword.set('');
        this.exitoPassword.set('');

        const { currentPassword, newPassword } = this.passwordForm.getRawValue();
        this.http.put(`${this.baseUrl}/me/password`, { currentPassword, newPassword }).subscribe({
            next: () => {
                this.guardandoPassword.set(false);
                this.exitoPassword.set('Contraseña actualizada correctamente.');
                this.passwordForm.reset();
            },
            error: (err: { error?: { message?: string } }) => {
                this.guardandoPassword.set(false);
                this.errorPassword.set(err.error?.message ?? 'No se pudo cambiar la contraseña. Verifique la contraseña actual.');
            },
        });
    }

    private passwordsMatchValidator(): ValidatorFn {
        return (group: AbstractControl): ValidationErrors | null => {
            const pwd = group.get('newPassword')?.value;
            const confirm = group.get('confirmPassword')?.value;
            if (!pwd || !confirm) return null;
            return pwd === confirm ? null : { mismatch: true };
        };
    }
}
