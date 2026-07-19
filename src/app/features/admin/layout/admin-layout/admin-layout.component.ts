import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminSidebarComponent } from '@features/admin/components/admin-sidebar/admin-sidebar.component';
import { AdminHeaderComponent } from '@features/admin/components/admin-header/admin-header.component';
import { ThemeService } from '@core/services/theme/theme';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    AdminSidebarComponent,
    AdminHeaderComponent,
  ],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLayoutComponent implements OnInit {
  private readonly themeService = inject(ThemeService);
  readonly isSidebarCollapsed = signal(false);

  ngOnInit(): void {
    this.themeService.setContext('admin');
  }

  onToggleCollapse(collapsed: boolean): void {
    this.isSidebarCollapsed.set(collapsed);
  }
}
