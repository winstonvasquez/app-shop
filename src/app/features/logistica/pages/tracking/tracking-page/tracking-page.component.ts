import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tracking-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Seguimiento de Envíos</h1>
        <p class="page-subtitle">Tracking en tiempo real</p>
      </div>
    </div>
    <div class="card">
      <div class="empty-state">
        <p>Tracking - Ver @designs/logistica.html LOG-06</p>
        <p class="text-muted">Requiere endpoint /api/guias-remision/:id/tracking</p>
      </div>
    </div>
  `
})
export class TrackingPageComponent {}
