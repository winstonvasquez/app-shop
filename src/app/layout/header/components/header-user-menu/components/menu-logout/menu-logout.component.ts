import { Component, inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-menu-logout',
  imports: [],
  templateUrl: './menu-logout.component.html',
  styleUrl: './menu-logout.component.scss',
})
export class MenuLogout {
  private authService = inject(AuthService);

  logout() {
    this.authService.logout();
  }
}
