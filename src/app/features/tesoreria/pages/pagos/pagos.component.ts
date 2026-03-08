import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PagosService } from '../../services/pagos.service';
import { Payment } from '../../models/tesoreria.model';

@Component({
    selector: 'app-pagos',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="p-4">
      <h2 class="text-2xl font-bold mb-4">Gestión de Pagos</h2>
      <div class="bg-surface shadow rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-border">
          <thead class="bg-surface-raised">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Fecha</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Beneficiario</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Concepto</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Tipo</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider text-right">Monto</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider text-center">Estado</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-surface divide-y divide-border">
            <tr *ngFor="let p of pagos">
              <td class="px-6 py-4 whitespace-nowrap text-sm">{{ (p.createdAt ? p.createdAt : p.fechaSolicitud) | date:'shortDate' }}</td>
              <td class="px-6 py-4 whitespace-nowrap font-medium">{{ p.beneficiarioNombre }}</td>
              <td class="px-6 py-4 text-sm text-subtle max-w-xs truncate" title="{{p.concepto}}">{{ p.concepto }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-subtle">{{ p.tipoPago }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-right">{{ p.monto | currency:p.moneda }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span [ngClass]="{
                  'bg-yellow-100 text-yellow-800': p.estado === 'PENDING',
                  'bg-blue-100 text-blue-800': p.estado === 'APPROVED',
                  'bg-success/20 text-green-800': p.estado === 'PAID',
                  'bg-error/20 text-red-800': p.estado === 'REJECTED'
                }" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ p.estado }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-subtle flex gap-2">
                <button *ngIf="p.estado === 'PENDING'" (click)="approve(p)" class="text-primary hover:text-indigo-900 border border-indigo-200 rounded px-2 bg-primary/10">Aprobar</button>
                <button *ngIf="p.estado === 'PENDING'" (click)="reject(p)" class="text-error-hover hover:text-red-900 border border-red-200 rounded px-2 bg-error/10">Rechazar</button>
                <button *ngIf="p.estado === 'APPROVED'" (click)="pay(p)" class="text-success-hover hover:text-green-900 border border-green-200 rounded px-2 bg-success/10">Pagar</button>
              </td>
            </tr>
            <tr *ngIf="pagos.length === 0">
              <td colspan="7" class="px-6 py-4 text-center text-subtle">No hay pagos registrados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class PagosComponent implements OnInit {
    private pagosService = inject(PagosService);
    pagos: Payment[] = [];

    ngOnInit(): void {
        this.loadPagos();
    }

    loadPagos() {
        this.pagosService.getAll().subscribe({
            next: (res) => this.pagos = res.content || res,
            error: (err) => console.error('Error loading pagos', err)
        });
    }

    approve(p: Payment) {
        if (p.id) {
            this.pagosService.approve(p.id).subscribe(() => this.loadPagos());
        }
    }

    reject(p: Payment) {
        if (p.id) {
            this.pagosService.reject(p.id).subscribe(() => this.loadPagos());
        }
    }

    pay(p: Payment) {
        if (p.id) {
            this.pagosService.markAsPaid(p.id).subscribe(() => this.loadPagos());
        }
    }
}
