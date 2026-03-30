import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-browsing-history',
  imports: [],
  templateUrl: './menu-browsing-history.component.html',
  styleUrl: './menu-browsing-history.component.scss',
})
export class MenuBrowsingHistory {
  private router = inject(Router);

  navigate(): void {
    this.router.navigate(['/account/history']);
  }
}
