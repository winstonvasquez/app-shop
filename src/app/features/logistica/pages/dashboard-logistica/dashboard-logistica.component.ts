import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AlmacenService } from '../../services/almacen.service';
import { Almacen } from '../../models/almacen.model';
import { MovimientoService } from '../../services/movimiento.service';

@Component({
  selector: 'app-dashboard-logistica',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard de Logística</h1>
        <p class="page-subtitle">Estado de operaciones logísticas</p>
      </div>
    </div>

    <div class="kpi-grid mb-lg">
      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">Almacenes Activos</span>
          <div class="kpi-icon kpi-icon-primary">🏪</div>
        </div>
        <div class="kpi-value">{{ almacenes().length }}</div>
        <div class="kpi-trend trend-neutral">{{ totalItems() }} items en stock</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">Movimientos Hoy</span>
          <div class="kpi-icon kpi-icon-success">🔄</div>
        </div>
        <div class="kpi-value">{{ movimientosHoy() }}</div>
        <div class="kpi-trend trend-neutral">{{ movimientosPendientes() }} pendientes</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">Stock Bajo</span>
          <div class="kpi-icon kpi-icon-warning">⚠️</div>
        </div>
        <div class="kpi-value">{{ stockBajo() }}</div>
        <div class="kpi-trend trend-down">Revisar inventario</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">Guias Este Mes</span>
          <div class="kpi-icon kpi-icon-info">📄</div>
        </div>
        <div class="kpi-value">0</div>
        <div class="kpi-trend trend-neutral">0 emitidas</div>
      </div>
    </div>

    <div class="charts-row mb-lg">
      <div class="card">
        <div class="card-title mb-md">Distribución de Stock por Almacén</div>
        @if (almacenes().length > 0) {
          <div class="chart-placeholder">
            @for (almacen of almacenes(); track almacen.id) {
              <div class="stock-bar">
                <span class="stock-label">{{ almacen.nombre }}</span>
                <div class="stock-bar-container">
                  <div class="stock-bar-fill" [style.width.%]="getStockPercent(almacen)"></div>
                </div>
                <span class="stock-value">{{ almacen.totalItems || 0 }} items</span>
              </div>
            }
          </div>
        } @else {
          <div class="empty-state">
            <p>No hay almacenes registrados</p>
            <button class="btn btn-primary" routerLink="/logistica/almacenes">
              Crear Almacén
            </button>
          </div>
        }
      </div>

      <div class="card">
        <div class="card-title mb-md">Últimos Movimientos</div>
        <div class="movements-list">
          @for (mov of ultimosMovimientos(); track mov.id) {
            <div class="movement-item">
              <span class="movement-icon" [class]="getTipoIcon(mov.tipo)">
                {{ getTipoIcon(mov.tipo) }}
              </span>
              <div class="movement-info">
                <span class="movement-code">{{ mov.codigo }}</span>
                <span class="movement-type">{{ formatTipo(mov.tipo) }}</span>
              </div>
              <span class="movement-date">{{ formatDate(mov.createdAt) }}</span>
            </div>
          } @empty {
            <div class="empty-state">
              <p>No hay movimientos recientes</p>
            </div>
          }
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Almacenes Recientes</span>
        <button class="btn btn-secondary btn-sm" routerLink="/logistica/almacenes">
          Ver todos →
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Dirección</th>
            <th>Items</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (almacen of almacenes(); track almacen.id) {
            <tr>
              <td class="font-mono">{{ almacen.codigo }}</td>
              <td>{{ almacen.nombre }}</td>
              <td class="text-muted">{{ almacen.direccion || '-' }}</td>
              <td class="text-right">{{ almacen.totalItems || 0 }}</td>
              <td>
                <span class="badge" [class.badge-success]="almacen.estado === 'ACTIVO'" 
                      [class.badge-warning]="almacen.estado === 'MANTENIMIENTO'">
                  {{ almacen.estado }}
                </span>
              </td>
              <td>
                <button class="btn btn-secondary btn-sm" 
                        [routerLink]="['/logistica/almacenes', almacen.id]">
                  Ver
                </button>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6" class="text-center text-muted">
                No hay almacenes registrados
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg);
    }
    .stock-bar {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      margin-bottom: var(--space-sm);
    }
    .stock-label {
      width: 120px;
      font-size: 13px;
    }
    .stock-bar-container {
      flex: 1;
      height: 20px;
      background: var(--color-bg);
      border-radius: 10px;
      overflow: hidden;
    }
    .stock-bar-fill {
      height: 100%;
      background: var(--color-primary);
      border-radius: 10px;
    }
    .stock-value {
      width: 80px;
      text-align: right;
      font-size: 13px;
      font-weight: 500;
    }
    .movements-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }
    .movement-item {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-sm);
      background: var(--color-bg);
      border-radius: 8px;
    }
    .movement-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      font-size: 16px;
    }
    .movement-icon.entrada { background: #D1FAE5; }
    .movement-icon.salida { background: #FEE2E2; }
    .movement-icon.traslado { background: #E0E7FF; }
    .movement-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .movement-code {
      font-weight: 500;
      font-size: 13px;
    }
    .movement-type {
      font-size: 12px;
      color: var(--color-text-muted);
    }
    .movement-date {
      font-size: 12px;
      color: var(--color-text-muted);
    }
    .empty-state {
      text-align: center;
      padding: var(--space-xl);
      color: var(--color-text-muted);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLogisticaComponent implements OnInit {
  private almacenService = inject(AlmacenService);
  private movimientoService = inject(MovimientoService);

  almacenes = signal<Almacen[]>([]);
  ultimosMovimientos = signal<any[]>([]);
  totalItems = signal(0);
  movimientosHoy = signal(0);
  movimientosPendientes = signal(0);
  stockBajo = signal(0);

  private companyId = 'demo-company';

  readonly trackByAlmacenId = (index: number, almacen: Almacen) => almacen.id;
  readonly trackByMovimientoId = (index: number, mov: any) => mov.id;

  ngOnInit() {
    this.loadAlmacenes();
    this.loadMovimientos();
  }

  loadAlmacenes() {
    this.almacenService.getAlmacenes(this.companyId, { size: 10 }).subscribe({
      next: (res) => {
        this.almacenes.set(res.content);
        this.totalItems.set(res.content.reduce((sum, a) => sum + (a.totalItems || 0), 0));
      },
      error: () => {
        this.almacenes.set([]);
      }
    });
  }

  loadMovimientos() {
    this.movimientoService.getMovimientos(this.companyId, { size: 5 }).subscribe({
      next: (res: any) => {
        this.ultimosMovimientos.set(res.content || []);
        this.movimientosHoy.set(res.totalElements || 0);
      },
      error: () => {
        this.ultimosMovimientos.set([]);
      }
    });
  }

  getStockPercent(almacen: Almacen): number {
    const total = this.totalItems();
    if (total === 0) return 0;
    return ((almacen.totalItems || 0) / total) * 100;
  }

  getTipoIcon(tipo: string): string {
    if (tipo?.startsWith('ENTRADA')) return '📥';
    if (tipo?.startsWith('SALIDA')) return '📤';
    if (tipo === 'TRASLADO') return '🔄';
    return '📦';
  }

  formatTipo(tipo: string): string {
    return tipo?.replace(/_/g, ' ') || '';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
  }
}
