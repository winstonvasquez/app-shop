import { Component, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.scss'
})
export class AdminHeaderComponent {
  private authService = inject(AuthService);

  searchQuery = signal('');
  hasNotifications = signal(true);
  userName = signal('Admin');
  userRole = signal('Administrador');
  isUserMenuOpen = signal(false);

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onNotificationClick(): void {}

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
