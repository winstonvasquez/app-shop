import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PosVentaService } from '../../services/pos-venta.service';
import { VentaPosResponse } from '../../models/venta-pos.model';

type MotivoDevolucion = 'PRODUCTO_DEFECTUOSO' | 'PRODUCTO_INCORRECTO' | 'CAMBIO_OPINION' | 'ERROR_COBRO' | 'OTRO';

const MOTIVOS: { valor: MotivoDevolucion; etiqueta: string }[] = [
    { valor: 'PRODUCTO_DEFECTUOSO',  etiqueta: 'Producto defectuoso' },
    { valor: 'PRODUCTO_INCORRECTO',  etiqueta: 'Producto incorrecto / no solicitado' },
    { valor: 'CAMBIO_OPINION',       etiqueta: 'Cambio de opinión del cliente' },
    { valor: 'ERROR_COBRO',          etiqueta: 'Error en el cobro' },
    { valor: 'OTRO',                 etiqueta: 'Otro motivo' }
];

@Component({
    selector: 'app-pos-devoluciones',
    standalone: true,
    imports: [DecimalPipe, DatePipe, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Devoluciones / Anulaciones POS</h1>
        <p class="page-subtitle">Busque la venta por N° ticket para iniciar la devolución</p>
      </div>
    </div>

    <!-- Buscador -->
    <div class="card" style="margin-bottom:var(--space-md)">
      <div class="card-body" style="display:flex;gap:12px;align-items:flex-end">
        <div style="flex:1">
          <label class="input-label">N° Ticket / ID de Venta</label>
          <input class="input-field" [(ngModel)]="busqueda"
                 placeholder="Ej: T-20240315-001 ó ID numérico"
                 (keydown.enter)="buscarVenta()">
        </div>
        <div style="width:160px">
          <label class="input-label">Buscar por</label>
          <select class="input-field" [(ngModel)]="tipoBusqueda">
            <option value="ticket">N° Ticket</option>
            <option value="id">ID de Venta</option>
          </select>
        </div>
        <button class="btn btn-primary" (click)="buscarVenta()" [disabled]="buscando() || !busqueda.trim()">
          {{ buscando() ? 'Buscando...' : 'Buscar' }}
        </button>
      </div>
    </div>

    @if (errorBusqueda()) {
      <div class="card mb-lg" style="border-left:3px solid var(--color-error);padding:var(--space-md)">
        <p style="color:var(--color-error);font-size:0.875rem">{{ errorBusqueda() }}</p>
      </div>
    }

    <!-- Venta encontrada -->
    @if (ventaSeleccionada()) {
      <div class="card" style="margin-bottom:var(--space-md)">
        <div class="card-header">
          <h3 class="card-title">Venta {{ ventaSeleccionada()!.numeroTicket }}</h3>
          <span [class]="ventaSeleccionada()!.estado === 'COMPLETADA' ? 'badge badge-success' : 'badge badge-error'">
            {{ ventaSeleccionada()!.estado }}
          </span>
        </div>
        <div class="card-body" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
          <div>
            <div class="text-sm" style="color:var(--color-text-muted)">Fecha</div>
            <div class="font-bold">{{ ventaSeleccionada()!.fechaCreacion | date:'dd/MM/yyyy HH:mm' }}</div>
          </div>
          <div>
            <div class="text-sm" style="color:var(--color-text-muted)">Cajero</div>
            <div class="font-bold">{{ ventaSeleccionada()!.cajeroNombre }}</div>
          </div>
          <div>
            <div class="text-sm" style="color:var(--color-text-muted)">Método de pago</div>
            <div class="font-bold">{{ ventaSeleccionada()!.metodoPago }}</div>
          </div>
          <div>
            <div class="text-sm" style="color:var(--color-text-muted)">Comprobante</div>
            <div class="font-bold">{{ ventaSeleccionada()!.tipoCpe }} {{ ventaSeleccionada()!.numeroCpe || '' }}</div>
          </div>
          <div>
            <div class="text-sm" style="color:var(--color-text-muted)">Cliente</div>
            <div class="font-bold">{{ ventaSeleccionada()!.clienteNombre || 'Consumidor Final' }}</div>
          </div>
          <div>
            <div class="text-sm" style="color:var(--color-text-muted)">Total</div>
            <div class="font-bold" style="font-size:1.25rem;color:var(--color-primary)">
              S/ {{ ventaSeleccionada()!.total | number:'1.2-2' }}
            </div>
          </div>
        </div>

        <!-- Detalle de ítems -->
        <table class="table">
          <thead>
            <tr>
              <th class="table-header-cell">SKU</th>
              <th class="table-header-cell">Producto</th>
              <th class="table-header-cell text-right">Cant.</th>
              <th class="table-header-cell text-right">P. Unit.</th>
              <th class="table-header-cell text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            @for (d of ventaSeleccionada()!.detalles; track d.id) {
              <tr class="table-row">
                <td class="table-cell font-mono text-sm">{{ d.varianteSku }}</td>
                <td class="table-cell">{{ d.varianteNombre }}</td>
                <td class="table-cell text-right">{{ d.cantidad }}</td>
                <td class="table-cell text-right font-mono">S/ {{ d.precioUnitario | number:'1.2-2' }}</td>
                <td class="table-cell text-right font-mono font-bold">S/ {{ d.subtotalLinea | number:'1.2-2' }}</td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3"></td>
              <td class="table-cell text-right" style="color:var(--color-text-muted)">Subtotal</td>
              <td class="table-cell text-right font-mono">S/ {{ ventaSeleccionada()!.subtotal | number:'1.2-2' }}</td>
            </tr>
            <tr>
              <td colspan="3"></td>
              <td class="table-cell text-right" style="color:var(--color-text-muted)">IGV 18%</td>
              <td class="table-cell text-right font-mono">S/ {{ ventaSeleccionada()!.igv | number:'1.2-2' }}</td>
            </tr>
            <tr>
              <td colspan="3"></td>
              <td class="table-cell text-right font-bold">TOTAL</td>
              <td class="table-cell text-right font-mono font-bold" style="color:var(--color-primary)">
                S/ {{ ventaSeleccionada()!.total | number:'1.2-2' }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Formulario de devolución -->
      @if (ventaSeleccionada()!.estado === 'COMPLETADA') {
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Solicitud de Devolución / Anulación</h3>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
            <div>
              <label class="input-label">Motivo de la devolución *</label>
              <select class="input-field" [(ngModel)]="motivo">
                <option value="">Seleccionar motivo...</option>
                @for (m of motivos; track m.valor) {
                  <option [value]="m.valor">{{ m.etiqueta }}</option>
                }
              </select>
            </div>
            <div>
              <label class="input-label">Observaciones</label>
              <textarea class="input-field" [(ngModel)]="observaciones" rows="3"
                        placeholder="Descripción adicional del motivo de devolución..."></textarea>
            </div>
            <div style="padding:12px;background:color-mix(in srgb,var(--color-warning) 12%,transparent);border-radius:8px;border:1px solid color-mix(in srgb,var(--color-warning) 30%,transparent)">
              <div class="font-bold" style="color:var(--color-warning);margin-bottom:4px">Información importante</div>
              <ul style="color:var(--color-text-muted);font-size:0.85rem;margin:0;padding-left:16px;line-height:1.8">
                <li>Esta operación anulará la venta completa y revertirá el stock.</li>
                <li>Si el comprobante es BOLETA o FACTURA electrónica, se generará una Nota de Crédito en SUNAT.</li>
                <li>El monto a devolver es: <strong style="color:var(--color-primary)">S/ {{ ventaSeleccionada()!.total | number:'1.2-2' }}</strong></li>
                <li>Esta acción <strong>no puede revertirse</strong>.</li>
              </ul>
            </div>

            @if (procesado()) {
              <div style="padding:12px;background:color-mix(in srgb,var(--color-success) 12%,transparent);border-radius:8px;border:1px solid color-mix(in srgb,var(--color-success) 30%,transparent)">
                <div class="font-bold" style="color:var(--color-success)">Devolución procesada exitosamente</div>
                <div style="color:var(--color-text-muted);font-size:0.85rem;margin-top:4px">
                  La venta ha sido anulada. Entregue S/ {{ ventaSeleccionada()!.total | number:'1.2-2' }} al cliente.
                </div>
              </div>
            }
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="limpiar()">Cancelar</button>
            <button class="btn btn-danger" (click)="confirmarDevolucion()"
                    [disabled]="!motivo || procesando() || procesado()">
              {{ procesando() ? 'Procesando...' : 'Confirmar Devolución' }}
            </button>
          </div>
        </div>
      } @else {
        <div class="card">
          <div class="card-body" style="text-align:center;padding:var(--space-lg)">
            <p style="color:var(--color-text-muted)">Esta venta ya ha sido anulada previamente.</p>
          </div>
        </div>
      }
    }

    <!-- Historial de devoluciones del día -->
    @if (devolucionesProcesadas().length > 0) {
      <div class="card" style="margin-top:var(--space-md)">
        <div class="card-header">
          <h3 class="card-title">Devoluciones procesadas esta sesión</h3>
          <span class="badge badge-neutral">{{ devolucionesProcesadas().length }}</span>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th class="table-header-cell">Ticket</th>
              <th class="table-header-cell text-right">Total devuelto</th>
              <th class="table-header-cell">Motivo</th>
            </tr>
          </thead>
          <tbody>
            @for (d of devolucionesProcesadas(); track d.ticket) {
              <tr class="table-row">
                <td class="table-cell font-mono">{{ d.ticket }}</td>
                <td class="table-cell text-right font-mono font-bold" style="color:var(--color-warning)">
                  S/ {{ d.total | number:'1.2-2' }}
                </td>
                <td class="table-cell text-sm" style="color:var(--color-text-muted)">{{ d.motivo }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `
})
export class PosDevolucionesComponent {
    private readonly ventaService = inject(PosVentaService);

    busqueda = '';
    tipoBusqueda: 'ticket' | 'id' = 'ticket';
    motivo = '';
    observaciones = '';

    readonly motivos = MOTIVOS;
    buscando = signal(false);
    procesando = signal(false);
    procesado = signal(false);
    errorBusqueda = signal<string | null>(null);
    ventaSeleccionada = signal<VentaPosResponse | null>(null);
    devolucionesProcesadas = signal<{ ticket: string; total: number; motivo: string }[]>([]);

    buscarVenta() {
        if (!this.busqueda.trim()) return;
        this.buscando.set(true);
        this.errorBusqueda.set(null);
        this.ventaSeleccionada.set(null);
        this.procesado.set(false);

        const id = this.tipoBusqueda === 'id' ? parseInt(this.busqueda, 10) : NaN;
        if (this.tipoBusqueda === 'id' && !isNaN(id)) {
            this.ventaService.getRecibo(id).subscribe({
                next: (v) => { this.ventaSeleccionada.set(v); this.buscando.set(false); },
                error: () => {
                    this.errorBusqueda.set('No se encontró ninguna venta con ese ID. Verifique el número e intente nuevamente.');
                    this.buscando.set(false);
                }
            });
        } else {
            // Por N° ticket no está soportado en el servicio actual — error informativo
            this.errorBusqueda.set(
                'Búsqueda por N° ticket no disponible. Use "ID de Venta" e ingrese el número ID de la venta.'
            );
            this.buscando.set(false);
        }
    }

    confirmarDevolucion() {
        const venta = this.ventaSeleccionada();
        if (!venta || !this.motivo) return;
        this.procesando.set(true);

        this.ventaService.anularVenta(venta.id).subscribe({
            next: () => {
                this.devolucionesProcesadas.update(list => [
                    ...list,
                    { ticket: venta.numeroTicket, total: venta.total, motivo: this.motivoEtiqueta() }
                ]);
                this.procesado.set(true);
                this.procesando.set(false);
                // Actualizar estado en la vista
                this.ventaSeleccionada.set({ ...venta, estado: 'ANULADA' });
            },
            error: () => {
                this.procesando.set(false);
                this.errorBusqueda.set('Error al procesar la devolución. Intente nuevamente.');
            }
        });
    }

    limpiar() {
        this.busqueda = '';
        this.motivo = '';
        this.observaciones = '';
        this.ventaSeleccionada.set(null);
        this.errorBusqueda.set(null);
        this.procesado.set(false);
    }

    private motivoEtiqueta(): string {
        return MOTIVOS.find(m => m.valor === this.motivo)?.etiqueta ?? this.motivo;
    }
}
