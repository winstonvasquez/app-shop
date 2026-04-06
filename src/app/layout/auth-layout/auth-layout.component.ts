import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '@core/services/theme/theme';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './auth-layout.component.html',
  host: { class: 'block w-full min-h-screen' }
})
export class AuthLayoutComponent {
    constructor() {
        inject(ThemeService).setContext('admin');
    }
}
