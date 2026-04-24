import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-addresses',
  standalone: true,
  imports: [],
  templateUrl: './menu-addresses.component.html',
  styleUrl: './menu-addresses.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuAddresses {
  private router = inject(Router);

  goToAddresses(): void {
    this.router.navigate(['/account/addresses']);
  }
}
