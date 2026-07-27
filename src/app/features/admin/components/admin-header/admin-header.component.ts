import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@shared/services/toast.service';

/** Etiqueta legible por rol real de backend (tabla `rol`, ver microshopusers). */
const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Superadministrador',
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
  COMPRADOR: 'Comprador',
  CONTADOR: 'Contador',
  TESORERO: 'Tesorero',
  RRHH: 'RRHH',
  ALMACENERO: 'Almacenero',
  GERENTE: 'Gerente',
};

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.scss'
})
export class AdminHeaderComponent {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  searchQuery = signal('');
  hasNotifications = signal(true);
  userName = computed(() => this.authService.currentUser()?.username ?? 'Usuario');
  userRole = computed(() => {
    const role = this.authService.currentUser()?.role;
    if (!role) return 'Usuario';
    const code = role.replace(/^ROLE_/, '').toUpperCase();
    return ROLE_LABELS[code] ?? code;
  });
  isUserMenuOpen = signal(false);

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onNotificationClick(): void {
    // NotificationService (core) tiene loadUnreadCount/getPage pero no hay vista
    // dedicada admin (ej. /admin/notifications). Toast informativo evita que el
    // click sea silencioso. Reemplazar por dropdown o navegación cuando exista la vista.
    this.toastService.info('Centro de notificaciones', 'Próximamente');
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update(v => !v);
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  logout(): void {
    this.closeUserMenu();
    this.authService.logout();
  }
}
