import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovimientosFinancierosService } from '../../services/movimientos-financieros.service';
import { FinancialMovement } from '../../models/tesoreria.model';

@Component({
    selector: 'app-flujo-caja',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="p-4">
      <h2 class="text-2xl font-bold mb-4">Flujo de Caja y Movimientos</h2>
      
      <!-- Panel de Resumen Flujo -->
      <div class="bg-surface p-6 shadow rounded-lg mb-6 border-t-4 border-primary flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div class="flex flex-wrap gap-4 items-end">
          <div>
            <label class="block text-sm font-medium text-on">Fecha Inicio</label>
            <input type="date" [(ngModel)]="fechaInicio" class="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-indigo-500 sm:text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-on">Fecha Fin</label>
            <input type="date" [(ngModel)]="fechaFin" class="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-indigo-500 sm:text-sm">
          </div>
          <button (click)="loadData()" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm">
            Consultar
          </button>
        </div>
        
        <div class="bg-surface-raised px-6 py-4 rounded-lg flex flex-col items-end min-w-[200px]">
          <span class="text-xs uppercase font-bold text-subtle tracking-wider">Flujo de Caja Neto</span>
          <span class="text-3xl font-bold" [ngClass]="flujoCajaNeto >= 0 ? 'text-success-hover' : 'text-error-hover'">
            {{ flujoCajaNeto | currency:'USD' }}
          </span>
        </div>
      </div>

      <!-- Tabla de Movimientos -->
      <div class="bg-surface shadow rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-border">
          <thead class="bg-surface-raised">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Fecha</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Tipo</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Origen</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Descripción</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider text-right">Monto</th>
            </tr>
          </thead>
          <tbody class="bg-surface divide-y divide-border">
            <tr *ngFor="let m of movimientos">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-subtle">{{ m.fecha | date:'short' }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span [ngClass]="{
                  'bg-success/20 text-green-800': m.tipoMovimiento === 'INGRESO',
                  'bg-error/20 text-red-800': m.tipoMovimiento === 'EGRESO',
                  'bg-blue-100 text-blue-800': m.tipoMovimiento === 'TRANSFERENCIA'
                }" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ m.tipoMovimiento }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">{{ m.origen }}</td>
              <td class="px-6 py-4 text-sm text-subtle max-w-sm truncate" title="{{m.descripcion}}">
                {{ m.descripcion }}
                <div *ngIf="m.numeroOperacion" class="text-xs text-gray-400">Op: {{m.numeroOperacion}}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-right" [ngClass]="m.tipoMovimiento === 'INGRESO' ? 'text-success-hover' : (m.tipoMovimiento === 'EGRESO' ? 'text-error-hover' : 'text-on')">
                {{ m.tipoMovimiento === 'INGRESO' ? '+' : (m.tipoMovimiento === 'EGRESO' ? '-' : '') }}{{ m.monto | currency:m.moneda }}
              </td>
            </tr>
            <tr *ngIf="movimientos.length === 0">
              <td colspan="5" class="px-6 py-4 text-center text-subtle">No hay movimientos en este periodo</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class FlujoCajaComponent implements OnInit {
    private movService = inject(MovimientosFinancierosService);

    movimientos: FinancialMovement[] = [];
    flujoCajaNeto: number = 0;

    fechaInicio: string = '';
    fechaFin: string = '';

    ngOnInit(): void {
        // Iniciar el mes actual
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

        this.fechaFin = today.toISOString().split('T')[0];
        this.fechaInicio = firstDay.toISOString().split('T')[0];

        this.loadData();
    }

    loadData() {
        // Cargar flujo neto
        this.movService.getFlujoCaja(this.fechaInicio, this.fechaFin).subscribe({
            next: (val) => this.flujoCajaNeto = val,
            error: (err) => console.error('Error cargando flujo', err)
        });

        // Cargar movimientos
        this.movService.getAll(this.fechaInicio, this.fechaFin).subscribe({
            next: (res) => this.movimientos = res.content || res,
            error: (err) => console.error('Error cargando movimientos', err)
        });
    }
}
