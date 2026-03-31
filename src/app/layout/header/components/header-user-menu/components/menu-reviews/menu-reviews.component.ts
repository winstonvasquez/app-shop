import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-reviews',
  imports: [],
  templateUrl: './menu-reviews.component.html',
  styleUrl: './menu-reviews.component.scss',
})
export class MenuReviews {
  private router = inject(Router);

  navigate(): void {
    this.router.navigate(['/account/reviews']);
  }
}
