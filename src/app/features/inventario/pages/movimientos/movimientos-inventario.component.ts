import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventarioMovimientoService } from '../../services/inventario-movimiento.service';
import { InventarioMovimiento } from '../../models/inventario.model';

@Component({
    selector: 'app-movimientos-inventario',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="p-4">
      <h2 class="text-2xl font-bold mb-4">Movimientos de Inventario</h2>
      <div class="bg-surface shadow rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-border">
          <thead class="bg-surface-raised">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Fecha</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Tipo</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Producto ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Almacén ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Cantidad</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Referencia</th>
            </tr>
          </thead>
          <tbody class="bg-surface divide-y divide-border">
            <tr *ngFor="let m of movimientos">
              <td class="px-6 py-4 whitespace-nowrap">{{ m.date | date:'short' }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span [ngClass]="{
                  'bg-green-100 text-green-800': m.type === 'IN',
                  'bg-red-100 text-red-800': m.type === 'OUT',
                  'bg-blue-100 text-blue-800': m.type === 'TRANSFER',
                  'bg-yellow-100 text-yellow-800': m.type === 'ADJUSTMENT'
                }" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ m.type }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">{{ m.productId }}</td>
              <td class="px-6 py-4 whitespace-nowrap">{{ m.warehouseId }}</td>
              <td class="px-6 py-4 whitespace-nowrap font-bold" [ngClass]="{'text-green-600': m.quantity > 0, 'text-red-600': m.quantity < 0}">
                {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-subtle">{{ m.reference || '-' }}</td>
            </tr>
            <tr *ngIf="movimientos.length === 0">
              <td colspan="6" class="px-6 py-4 text-center text-subtle">No hay movimientos registrados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class MovimientosInventarioComponent implements OnInit {
    private movimientoService = inject(InventarioMovimientoService);
    movimientos: InventarioMovimiento[] = [];

    ngOnInit(): void {
        this.loadMovimientos();
    }

    loadMovimientos() {
        this.movimientoService.getAll().subscribe({
            next: (res) => {
                this.movimientos = res.content || res;
            },
            error: (err) => console.error('Error loading movements', err)
        });
    }
}
