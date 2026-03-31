import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AdminSidebarComponent } from '@features/admin/components/admin-sidebar/admin-sidebar.component';
import { AdminHeaderComponent } from '@features/admin/components/admin-header/admin-header.component';
import { ThemeSwitcherComponent } from '@shared/components/theme-switcher/theme-switcher';
import { ToastContainerComponent } from '@shared/components/toast/toast-container.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    AdminSidebarComponent,
    AdminHeaderComponent,
    ThemeSwitcherComponent,
    ToastContainerComponent
  ],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLayoutComponent {
}
