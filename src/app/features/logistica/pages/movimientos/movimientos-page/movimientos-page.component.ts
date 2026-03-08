import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovimientoService, Movimiento } from '../../../services/movimiento.service';

@Component({
  selector: 'app-movimientos-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Movimientos de Stock</h1>
        <p class="page-subtitle">Kardex de entradas, salidas y traslados</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary">📥 Exportar</button>
        <button class="btn btn-primary">+ Movimiento</button>
      </div>
    </div>

    <div class="card mb-lg">
      <div class="flex flex-wrap items-end gap-[var(--space-md)]">
        <div class="form-group min-w-[200px] m-0">
          <label class="form-label">Buscar</label>
          <input class="form-control" placeholder="Código, referencia...">
        </div>
        <div class="form-group m-0">
          <label class="form-label">Tipo</label>
          <select class="form-control" [(ngModel)]="tipoFilter">
            <option value="">Todos</option>
            <option value="ENTRADA_COMPRA">Entrada Compra</option>
            <option value="SALIDA_VENTA">Salida Venta</option>
            <option value="TRASLADO">Traslado</option>
          </select>
        </div>
        <button class="btn btn-primary">Buscar</button>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Código</th>
            <th>Almacén Origen</th>
            <th>Almacén Destino</th>
            <th>Referencia</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          @for (mov of movimientos(); track mov.id) {
            <tr>
              <td>{{ formatDate(mov.createdAt) }}</td>
              <td>
                <span class="badge" [class.badge-success]="mov.tipo.startsWith('ENTRADA')"
                      [class.badge-danger]="mov.tipo.startsWith('SALIDA')"
                      [class.badge-info]="mov.tipo === 'TRASLADO'">
                  {{ formatTipo(mov.tipo) }}
                </span>
              </td>
              <td class="font-mono">{{ mov.codigo }}</td>
              <td>{{ mov.almacenOrigen || '-' }}</td>
              <td>{{ mov.almacenDestino || '-' }}</td>
              <td class="text-muted">{{ mov.referenciaTipo || '-' }}</td>
              <td>
                <span class="badge badge-success">{{ mov.estado }}</span>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="text-center text-muted">
                No hay movimientos registrados
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class MovimientosPageComponent implements OnInit {
  private movimientoService = inject(MovimientoService);

  movimientos = signal<Movimiento[]>([]);
  tipoFilter = '';
  companyId = 'demo-company';

  ngOnInit() {
    this.loadMovimientos();
  }

  loadMovimientos() {
    this.movimientoService.getMovimientos(this.companyId, { size: 20 }).subscribe({
      next: (res: any) => this.movimientos.set(res.content || []),
      error: () => this.movimientos.set([])
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }

  formatTipo(tipo: string): string {
    return tipo?.replace(/_/g, ' ') || '';
  }
}
