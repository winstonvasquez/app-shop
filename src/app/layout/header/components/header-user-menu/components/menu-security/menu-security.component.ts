import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-security',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-security.component.html',
  styleUrl: './menu-security.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuSecurity {
  private router = inject(Router);

  goToSecurity(): void {
    this.router.navigate(['/account/security']);
  }
}
