import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KardexService } from '../../services/kardex.service';
import { KardexEntry } from '../../models/inventario.model';

@Component({
    selector: 'app-kardex',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="p-4">
      <h2 class="text-2xl font-bold mb-4">Kardex Valorizado</h2>
      
      <div class="bg-surface p-4 shadow rounded-lg mb-4 flex gap-4 items-end">
        <div>
          <label class="block text-sm font-medium text-on">Producto ID</label>
          <input type="number" [(ngModel)]="productId" class="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-on">Almacén ID</label>
          <input type="number" [(ngModel)]="warehouseId" class="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
        </div>
        <button (click)="loadKardex()" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Consultar
        </button>
      </div>

      <div class="bg-surface shadow rounded-lg overflow-hidden" *ngIf="kardex.length > 0">
        <table class="min-w-full divide-y divide-border">
          <thead class="bg-surface-raised">
            <tr>
              <th rowspan="2" class="px-6 py-3 border-b border-border text-left text-xs font-medium text-subtle uppercase tracking-wider">Fecha / Ref</th>
              <th colspan="3" class="px-6 py-3 border-b border-l border-border text-center text-xs font-bold text-on uppercase tracking-wider bg-info/10">Entradas</th>
              <th colspan="3" class="px-6 py-3 border-b border-l border-border text-center text-xs font-bold text-on uppercase tracking-wider bg-error/10">Salidas</th>
              <th colspan="3" class="px-6 py-3 border-b border-l border-border text-center text-xs font-bold text-on uppercase tracking-wider bg-success/10">Saldos</th>
            </tr>
            <tr>
              <!-- Entradas -->
              <th class="px-2 py-2 border-b border-l border-border text-right text-xs font-medium text-subtle uppercase">Cant</th>
              <th class="px-2 py-2 border-b border-border text-right text-xs font-medium text-subtle uppercase">C.U</th>
              <th class="px-2 py-2 border-b border-border text-right text-xs font-medium text-subtle uppercase">Total</th>
              <!-- Salidas -->
              <th class="px-2 py-2 border-b border-l border-border text-right text-xs font-medium text-subtle uppercase">Cant</th>
              <th class="px-2 py-2 border-b border-border text-right text-xs font-medium text-subtle uppercase">C.U</th>
              <th class="px-2 py-2 border-b border-border text-right text-xs font-medium text-subtle uppercase">Total</th>
              <!-- Saldos -->
              <th class="px-2 py-2 border-b border-l border-border text-right text-xs font-medium text-subtle uppercase">Cant</th>
              <th class="px-2 py-2 border-b border-border text-right text-xs font-medium text-subtle uppercase">C.U</th>
              <th class="px-2 py-2 border-b border-border text-right text-xs font-medium text-subtle uppercase">Total</th>
            </tr>
          </thead>
          <tbody class="bg-surface divide-y divide-border font-mono text-sm">
            <tr *ngFor="let k of kardex" class="hover:bg-surface-raised">
              <td class="px-6 py-2 whitespace-nowrap">
                <div>{{ k.date | date:'shortDate' }}</div>
                <div class="text-xs text-subtle">{{ k.movementType }} {{ k.documentRef ? '- ' + k.documentRef : '' }}</div>
              </td>
              <!-- Entradas -->
              <td class="px-2 py-2 border-l text-right text-blue-600">{{ k.quantityIn > 0 ? k.quantityIn : '' }}</td>
              <td class="px-2 py-2 text-right text-blue-600">{{ k.quantityIn > 0 ? (k.unitCost | number:'1.2-2') : '' }}</td>
              <td class="px-2 py-2 text-right text-blue-600">{{ k.quantityIn > 0 ? ((k.quantityIn * k.unitCost) | number:'1.2-2') : '' }}</td>
              <!-- Salidas -->
              <td class="px-2 py-2 border-l text-right text-red-600">{{ k.quantityOut > 0 ? k.quantityOut : '' }}</td>
              <td class="px-2 py-2 text-right text-red-600">{{ k.quantityOut > 0 ? (k.unitCost | number:'1.2-2') : '' }}</td>
              <td class="px-2 py-2 text-right text-red-600">{{ k.quantityOut > 0 ? ((k.quantityOut * k.unitCost) | number:'1.2-2') : '' }}</td>
              <!-- Saldos -->
              <td class="px-2 py-2 border-l font-bold text-right text-green-700">{{ k.balance }}</td>
              <td class="px-2 py-2 text-right text-green-700">{{ k.unitCost | number:'1.2-2' }}</td>
              <td class="px-2 py-2 text-right text-green-700 font-bold">{{ k.totalCost | number:'1.2-2' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div *ngIf="kardex.length === 0 && searchAttempted" class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
        <div class="flex">
          <div class="ml-3">
            <p class="text-sm text-yellow-700">No se encontraron registros de kardex para los parámetros especificados.</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class KardexComponent {
    private kardexService = inject(KardexService);

    productId: number = 1;
    warehouseId: number = 1;
    kardex: KardexEntry[] = [];
    searchAttempted = false;

    loadKardex() {
        this.searchAttempted = true;
        if (!this.productId || !this.warehouseId) return;

        this.kardexService.getKardex(this.productId, this.warehouseId).subscribe({
            next: (res) => this.kardex = res,
            error: (err) => {
                console.error('Error loading kardex', err);
                this.kardex = [];
            }
        });
    }
}
