import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-guias-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Guías de Remisión</h1>
        <p class="page-subtitle">GR-SUNAT electrónicas</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary">+ Nueva GR</button>
      </div>
    </div>
    <div class="card">
      <div class="empty-state">
        <p>Guias de Remisión - Ver @designs/logistica.html LOG-05</p>
        <p class="text-muted">Requiere endpoint /api/guias-remision</p>
      </div>
    </div>
  `
})
export class GuiasPageComponent {}
