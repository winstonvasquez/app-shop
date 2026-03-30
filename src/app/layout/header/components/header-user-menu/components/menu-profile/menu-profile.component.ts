import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-menu-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-profile.component.html',
  styleUrl: './menu-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuProfile {
  private router = inject(Router);
  private authService = inject(AuthService);

  userName = this.authService.currentUser;

  goToProfile(): void {
    this.router.navigate(['/account/profile']);
  }
}
