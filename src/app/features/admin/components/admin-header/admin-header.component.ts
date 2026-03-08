import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.scss'
})
export class AdminHeaderComponent {
  searchQuery = signal('');
  hasNotifications = signal(true);
  userName = signal('Admin');
  userRole = signal('Administrador');

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    // Implement search logic here
  }

  onNotificationClick(): void {
    // Implement notification logic here
    console.log('Notifications clicked');
  }

  onUserMenuClick(): void {
    // Implement user menu logic here
    console.log('User menu clicked');
  }
}
