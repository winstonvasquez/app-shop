import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inventario-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Inventario</h1>
        <p class="page-subtitle">Control de stock por almacén</p>
      </div>
    </div>
    <div class="card">
      <div class="empty-state">
        <p>Inventario - Ver @designs/logistica.html LOG-03</p>
        <p class="text-muted">Requiere endpoint /api/inventario</p>
      </div>
    </div>
  `
})
export class InventarioPageComponent {}
