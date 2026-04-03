import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-permissions',
  standalone: true,
  imports: [],
  templateUrl: './menu-permissions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuPermissions {
  private router = inject(Router);

  goToPermissions(): void {
    this.router.navigate(['/account/permissions']);
  }
}
