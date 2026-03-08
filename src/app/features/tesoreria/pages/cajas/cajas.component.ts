import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CajasService } from '../../services/cajas.service';
import { CashRegister } from '../../models/tesoreria.model';

@Component({
    selector: 'app-cajas',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="p-4">
      <h2 class="text-2xl font-bold mb-4">Control de Cajas</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div *ngFor="let c of cajas" class="bg-surface rounded-lg shadow p-6 border-t-4" [ngClass]="c.estado === 'ABIERTA' ? 'border-green-500' : 'border-gray-400'">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-lg font-bold text-on">{{ c.nombre }}</h3>
              <p class="text-sm text-subtle">ID: {{ c.id }}</p>
            </div>
            <span [ngClass]="c.estado === 'ABIERTA' ? 'bg-success/20 text-green-800' : 'bg-surface-sunken text-on'" class="px-2 py-1 text-xs font-semibold rounded-full">
              {{ c.estado }}
            </span>
          </div>
          
          <div class="mb-4">
            <p class="text-sm font-medium text-subtle uppercase">Saldo Actual</p>
            <p class="text-3xl font-bold text-on">{{ c.saldoActual | currency:'USD' }}</p>
          </div>
          
          <div class="text-xs text-subtle mb-6 space-y-1">
            <p *ngIf="c.fechaApertura">Abierta: {{ c.fechaApertura | date:'short' }}</p>
            <p *ngIf="c.fechaCierre">Cerrada: {{ c.fechaCierre | date:'short' }}</p>
          </div>
          
          <div class="flex gap-2 w-full justify-end border-t pt-4">
            <button *ngIf="c.estado === 'CERRADA'" (click)="openRegister(c)" class="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700 w-full">Abrir Caja (Base: $100)</button>
            <button *ngIf="c.estado === 'ABIERTA'" (click)="closeRegister(c)" class="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 w-full">Cerrar Caja</button>
          </div>
        </div>
      </div>
      
      <div *ngIf="cajas.length === 0" class="bg-surface-raised p-6 rounded-lg text-center border">
        <p class="text-subtle">No hay cajas registradas. Crea una desde la API.</p>
      </div>
    </div>
  `
})
export class CajasComponent implements OnInit {
    private cajasService = inject(CajasService);
    cajas: CashRegister[] = [];

    ngOnInit(): void {
        this.loadCajas();
    }

    loadCajas() {
        this.cajasService.getAll().subscribe({
            next: (res) => this.cajas = res.content || res,
            error: (err) => console.error('Error loading cajas', err)
        });
    }

    openRegister(c: CashRegister) {
        if (c.id) {
            // Simulating base amount of 100 for aperture
            this.cajasService.open(c.id, 100.0).subscribe(() => this.loadCajas());
        }
    }

    closeRegister(c: CashRegister) {
        if (c.id) {
            this.cajasService.close(c.id).subscribe(() => this.loadCajas());
        }
    }
}
