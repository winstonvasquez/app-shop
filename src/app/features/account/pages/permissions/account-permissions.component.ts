import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';

interface PermissionItem {
    codigo: string;
    nombre: string;
    efecto: string;
}

interface UserPermissions {
    rolNombre: string;
    rolDescripcion: string;
    isStandardCustomer: boolean;
    permissions: PermissionItem[];
}

@Component({
    selector: 'app-account-permissions',
    standalone: true,
    imports: [BreadcrumbComponent],
    templateUrl: './account-permissions.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPermissionsComponent implements OnInit {
    private http = inject(HttpClient);

    readonly breadcrumbItems: BreadcrumbItem[] = [
        { label: 'Inicio', route: ['/home'] },
        { label: 'Mi Cuenta' },
        { label: 'Permisos' }
    ];

    permissions = signal<UserPermissions | null>(null);
    loading = signal(true);
    error = signal<string | null>(null);

    ngOnInit(): void {
        this.http.get<UserPermissions>(`${environment.apiUrls.users}/api/users/me/permissions`).subscribe({
            next: (data) => {
                this.permissions.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('No se pudieron cargar los permisos.');
                this.loading.set(false);
            }
        });
    }
}
