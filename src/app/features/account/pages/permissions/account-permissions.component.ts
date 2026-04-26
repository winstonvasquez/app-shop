import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '@env/environment';
import { DsAccountShellComponent, DsBadgeComponent } from '@shared/ui/ds';

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
    imports: [LucideAngularModule, DsAccountShellComponent, DsBadgeComponent],
    templateUrl: './account-permissions.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPermissionsComponent implements OnInit {
    private http = inject(HttpClient);
    private authService = inject(AuthService);

    userName = computed(() => this.authService.currentUser()?.username ?? '');

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
