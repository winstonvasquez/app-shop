import { Component, ChangeDetectionStrategy, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly isSidebarCollapsed = signal(false);
  /** Menú lateral abierto en móvil/tablet (<768px). */
  readonly mobileOpen = signal(false);

  ngOnInit(): void {
    this.themeService.setContext('admin');
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.mobileOpen.set(false));
  }

  onToggleCollapse(collapsed: boolean): void {
    this.isSidebarCollapsed.set(collapsed);
  }
}
