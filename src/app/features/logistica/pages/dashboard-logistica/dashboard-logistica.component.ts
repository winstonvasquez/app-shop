import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AlmacenService } from '../../services/almacen.service';
import { Almacen } from '../../models/almacen.model';
import { MovimientoService } from '../../services/movimiento.service';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard-logistica',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './dashboard-logistica.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLogisticaComponent implements OnInit {
  private almacenService = inject(AlmacenService);
  private movimientoService = inject(MovimientoService);
  private authService = inject(AuthService);

  almacenes = signal<Almacen[]>([]);
  ultimosMovimientos = signal<any[]>([]);
  totalItems = signal(0);
  movimientosHoy = signal(0);
  movimientosPendientes = signal(0);
  stockBajo = signal(0);

  private get companyId(): string {
    const id = this.authService.currentUser()?.activeCompanyId ?? 1;
    return String(id);
  }

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
