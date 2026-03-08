import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventarioStockService } from '../../services/inventario-stock.service';
import { InventarioStock } from '../../models/inventario.model';

@Component({
    selector: 'app-stock-inventario',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="p-4">
      <h2 class="text-2xl font-bold mb-4">Stock de Inventario</h2>
      <div class="bg-surface shadow rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-border">
          <thead class="bg-surface-raised">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Producto ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Almacén ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Cantidad</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Mínimo</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Máximo</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Última Act.</th>
            </tr>
          </thead>
          <tbody class="bg-surface divide-y divide-border">
            <tr *ngFor="let s of stock">
              <td class="px-6 py-4 whitespace-nowrap font-medium">{{ s.productId }}</td>
              <td class="px-6 py-4 whitespace-nowrap">{{ s.warehouseId }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="font-bold text-lg" [ngClass]="{'text-red-500': s.quantity <= s.minQuantity}">
                  {{ s.quantity }}
                </span>
                <span *ngIf="s.quantity <= s.minQuantity" class="ml-2 text-xs text-red-500 font-semibold uppercase">Low Stock</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-subtle">{{ s.minQuantity }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-subtle">{{ s.maxQuantity }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-subtle">{{ s.lastUpdate | date:'short' }}</td>
            </tr>
            <tr *ngIf="stock.length === 0">
              <td colspan="6" class="px-6 py-4 text-center text-subtle">No hay registros de stock</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class StockInventarioComponent implements OnInit {
    private stockService = inject(InventarioStockService);
    stock: InventarioStock[] = [];

    ngOnInit(): void {
        this.loadStock();
    }

    loadStock() {
        this.stockService.getAll().subscribe({
            next: (res) => {
                this.stock = res.content || res;
            },
            error: (err) => console.error('Error loading stock', err)
        });
    }
}
