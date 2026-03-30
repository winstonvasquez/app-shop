import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-notifications',
  imports: [],
  templateUrl: './menu-notifications.component.html',
  styleUrl: './menu-notifications.component.scss',
})
export class MenuNotifications {
  private router = inject(Router);

  navigate(): void {
    this.router.navigate(['/account/notifications']);
  }
}
