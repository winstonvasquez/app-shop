import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PosVentaService } from '../../services/pos-venta.service';
import { VentaPosResponse } from '../../models/venta-pos.model';

type MotivoDevolucion = 'PRODUCTO_DEFECTUOSO' | 'PRODUCTO_INCORRECTO' | 'CAMBIO_OPINION' | 'ERROR_COBRO' | 'OTRO';

const MOTIVOS: { valor: MotivoDevolucion; etiqueta: string }[] = [
    { valor: 'PRODUCTO_DEFECTUOSO',  etiqueta: 'Producto defectuoso' },
    { valor: 'PRODUCTO_INCORRECTO',  etiqueta: 'Producto incorrecto / no solicitado' },
    { valor: 'CAMBIO_OPINION',       etiqueta: 'Cambio de opinion del cliente' },
    { valor: 'ERROR_COBRO',          etiqueta: 'Error en el cobro' },
    { valor: 'OTRO',                 etiqueta: 'Otro motivo' }
];

@Component({
    selector: 'app-pos-devoluciones',
    standalone: true,
    imports: [DecimalPipe, DatePipe, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- Header -->
    <div class="mb-5">
      <h2 class="text-lg font-bold text-on">Devoluciones / Anulaciones</h2>
      <p class="text-sm text-muted mt-0.5">Busque la venta por N° ticket o ID para iniciar la devolucion</p>
    </div>

    <!-- Buscador -->
    <div class="flex gap-3 items-end mb-4">
      <div class="flex-1">
        <label class="text-xs font-semibold text-subtle uppercase tracking-wide mb-1 block">N° Ticket / ID de Venta</label>
        <input class="input-field !h-10" [(ngModel)]="busqueda"
               placeholder="Ej: TICK-001000 o ID numerico"
               (keydown.enter)="buscarVenta()">
      </div>
      <div class="w-36">
        <label class="text-xs font-semibold text-subtle uppercase tracking-wide mb-1 block">Buscar por</label>
        <select class="input-field !h-10" [(ngModel)]="tipoBusqueda">
          <option value="ticket">N° Ticket</option>
          <option value="id">ID de Venta</option>
        </select>
      </div>
      <button class="btn-primary !h-10 !px-5 shrink-0" (click)="buscarVenta()" [disabled]="buscando() || !busqueda.trim()">
        @if (buscando()) {
          <svg class="animate-spin" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M10 3a7 7 0 017 7" stroke-linecap="round" />
          </svg>
        } @else {
          Buscar
        }
      </button>
    </div>

    <!-- Error -->
    @if (errorBusqueda()) {
      <div class="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-sm text-[var(--color-error)]">
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" class="shrink-0">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        {{ errorBusqueda() }}
      </div>
    }

    <!-- Venta encontrada -->
    @if (ventaSeleccionada(); as venta) {
      <div class="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden mb-4">
        <!-- Header de la venta -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <div class="flex items-center gap-3">
            <span class="font-bold text-on">{{ venta.numeroTicket }}</span>
            <span class="text-xs font-mono text-muted">ID: {{ venta.id }}</span>
          </div>
          <span class="text-xs font-bold px-2.5 py-1 rounded-full"
              [class]="venta.estado === 'COMPLETADA'
                ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
                : 'bg-[var(--color-error)]/15 text-[var(--color-error)]'">
            {{ venta.estado }}
          </span>
        </div>

        <!-- Info grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 px-4 py-3">
          <div>
            <p class="text-[10px] text-muted uppercase tracking-wide">Fecha</p>
            <p class="text-sm font-medium text-on">{{ venta.fechaCreacion | date:'dd/MM/yyyy HH:mm' }}</p>
          </div>
          <div>
            <p class="text-[10px] text-muted uppercase tracking-wide">Cajero</p>
            <p class="text-sm font-medium text-on">{{ venta.cajeroNombre }}</p>
          </div>
          <div>
            <p class="text-[10px] text-muted uppercase tracking-wide">Metodo de pago</p>
            <p class="text-sm font-medium text-on">{{ venta.metodoPago }}</p>
          </div>
          <div>
            <p class="text-[10px] text-muted uppercase tracking-wide">Comprobante</p>
            <p class="text-sm font-medium text-on">{{ venta.tipoCpe }} {{ venta.numeroCpe || '' }}</p>
          </div>
          <div>
            <p class="text-[10px] text-muted uppercase tracking-wide">Cliente</p>
            <p class="text-sm font-medium text-on">{{ venta.clienteNombre || 'Consumidor Final' }}</p>
          </div>
          <div>
            <p class="text-[10px] text-muted uppercase tracking-wide">Total</p>
            <p class="text-lg font-bold text-[var(--color-primary)]">
              <span class="text-xs align-super mr-px">S/</span>{{ venta.total | number:'1.2-2' }}
            </p>
          </div>
        </div>

        <!-- Items table -->
        <div class="border-t border-[var(--color-border)]">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-[var(--color-background)]">
                <th class="px-4 py-2 text-left text-[10px] font-semibold text-muted uppercase">SKU</th>
                <th class="px-4 py-2 text-left text-[10px] font-semibold text-muted uppercase">Producto</th>
                <th class="px-4 py-2 text-right text-[10px] font-semibold text-muted uppercase">Cant.</th>
                <th class="px-4 py-2 text-right text-[10px] font-semibold text-muted uppercase">P.Unit.</th>
                <th class="px-4 py-2 text-right text-[10px] font-semibold text-muted uppercase">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              @for (d of venta.detalles; track d.id) {
                <tr class="border-t border-[var(--color-border)]/50">
                  <td class="px-4 py-2 font-mono text-xs text-muted">{{ d.varianteSku }}</td>
                  <td class="px-4 py-2 text-on">{{ d.varianteNombre }}</td>
                  <td class="px-4 py-2 text-right text-on">{{ d.cantidad }}</td>
                  <td class="px-4 py-2 text-right font-mono text-subtle">S/ {{ d.precioUnitario | number:'1.2-2' }}</td>
                  <td class="px-4 py-2 text-right font-mono font-semibold text-on">S/ {{ d.subtotalLinea | number:'1.2-2' }}</td>
                </tr>
              }
            </tbody>
          </table>
          <!-- Totals -->
          <div class="flex flex-col items-end gap-1 px-4 py-3 border-t border-[var(--color-border)]">
            <div class="flex gap-8 text-sm">
              <span class="text-muted">Subtotal</span>
              <span class="font-mono text-on">S/ {{ venta.subtotal | number:'1.2-2' }}</span>
            </div>
            <div class="flex gap-8 text-sm">
              <span class="text-muted">IGV 18%</span>
              <span class="font-mono text-on">S/ {{ venta.igv | number:'1.2-2' }}</span>
            </div>
            <div class="flex gap-8 text-base font-bold">
              <span class="text-on">TOTAL</span>
              <span class="font-mono text-[var(--color-primary)]">S/ {{ venta.total | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Formulario de devolucion -->
      @if (venta.estado === 'COMPLETADA') {
        <div class="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
          <div class="px-4 py-3 border-b border-[var(--color-border)]">
            <h3 class="font-bold text-on text-sm">Solicitud de Devolucion</h3>
          </div>
          <div class="p-4 flex flex-col gap-4">
            <div>
              <label class="text-xs font-semibold text-subtle uppercase tracking-wide mb-1 block">Motivo *</label>
              <select class="input-field !h-10" [(ngModel)]="motivo">
                <option value="">Seleccionar motivo...</option>
                @for (m of motivos; track m.valor) {
                  <option [value]="m.valor">{{ m.etiqueta }}</option>
                }
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold text-subtle uppercase tracking-wide mb-1 block">Observaciones</label>
              <textarea class="input-field" [(ngModel)]="observaciones" rows="2"
                        placeholder="Descripcion adicional..."></textarea>
            </div>

            <!-- Warning box -->
            <div class="flex gap-3 p-3 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" class="text-[var(--color-warning)] shrink-0 mt-0.5">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <div class="text-xs text-subtle leading-relaxed">
                <p class="font-bold text-[var(--color-warning)] mb-1">Informacion importante</p>
                <ul class="list-disc pl-4 space-y-0.5">
                  <li>Se anulara la venta completa y se revertira el stock.</li>
                  <li>Si es BOLETA o FACTURA, se generara Nota de Credito SUNAT.</li>
                  <li>Monto a devolver: <strong class="text-[var(--color-primary)]">S/ {{ venta.total | number:'1.2-2' }}</strong></li>
                  <li>Esta accion <strong>no puede revertirse</strong>.</li>
                </ul>
              </div>
            </div>

            <!-- Success message -->
            @if (procesado()) {
              <div class="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/20">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" class="text-[var(--color-success)] shrink-0">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <div class="text-sm">
                  <p class="font-bold text-[var(--color-success)]">Devolucion procesada</p>
                  <p class="text-subtle text-xs mt-0.5">Entregue S/ {{ venta.total | number:'1.2-2' }} al cliente.</p>
                </div>
              </div>
            }
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 px-4 py-3 border-t border-[var(--color-border)]">
            <button class="btn-secondary !h-9 !px-4" (click)="limpiar()">Cancelar</button>
            <button class="!h-9 !px-5 rounded-xl text-sm font-semibold text-white transition-colors"
                [class]="!motivo || procesando() || procesado()
                  ? 'bg-[var(--color-border)] cursor-not-allowed'
                  : 'bg-[var(--color-error)] hover:brightness-110 active:brightness-90'"
                [disabled]="!motivo || procesando() || procesado()"
                (click)="confirmarDevolucion()">
              @if (procesando()) {
                <svg class="animate-spin inline mr-1" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M10 3a7 7 0 017 7" stroke-linecap="round" />
                </svg>
                Procesando...
              } @else {
                Confirmar Devolucion
              }
            </button>
          </div>
        </div>
      } @else {
        <div class="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 text-center">
          <p class="text-muted text-sm">Esta venta ya fue anulada previamente.</p>
        </div>
      }
    }

    <!-- Historial de sesion -->
    @if (devolucionesProcesadas().length > 0) {
      <div class="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden mt-4">
        <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h3 class="font-bold text-on text-sm">Devoluciones esta sesion</h3>
          <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-border)] text-on">
            {{ devolucionesProcesadas().length }}
          </span>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[var(--color-background)]">
              <th class="px-4 py-2 text-left text-[10px] font-semibold text-muted uppercase">Ticket</th>
              <th class="px-4 py-2 text-right text-[10px] font-semibold text-muted uppercase">Total devuelto</th>
              <th class="px-4 py-2 text-left text-[10px] font-semibold text-muted uppercase">Motivo</th>
            </tr>
          </thead>
          <tbody>
            @for (d of devolucionesProcesadas(); track d.ticket) {
              <tr class="border-t border-[var(--color-border)]/50">
                <td class="px-4 py-2 font-mono text-on">{{ d.ticket }}</td>
                <td class="px-4 py-2 text-right font-mono font-bold text-[var(--color-warning)]">
                  S/ {{ d.total | number:'1.2-2' }}
                </td>
                <td class="px-4 py-2 text-xs text-muted">{{ d.motivo }}</td>
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

    buscarVenta(): void {
        if (!this.busqueda.trim()) return;
        this.buscando.set(true);
        this.errorBusqueda.set(null);
        this.ventaSeleccionada.set(null);
        this.procesado.set(false);

        if (this.tipoBusqueda === 'id') {
            const id = parseInt(this.busqueda, 10);
            if (isNaN(id)) {
                this.errorBusqueda.set('Ingrese un ID numerico valido.');
                this.buscando.set(false);
                return;
            }
            this.ventaService.getRecibo(id).subscribe({
                next: (v) => { this.ventaSeleccionada.set(v); this.buscando.set(false); },
                error: () => {
                    this.errorBusqueda.set('No se encontro ninguna venta con ID ' + id);
                    this.buscando.set(false);
                }
            });
        } else {
            this.ventaService.buscarPorTicket(this.busqueda.trim()).subscribe({
                next: (v) => { this.ventaSeleccionada.set(v); this.buscando.set(false); },
                error: () => {
                    this.errorBusqueda.set('No se encontro ninguna venta con ticket "' + this.busqueda.trim() + '"');
                    this.buscando.set(false);
                }
            });
        }
    }

    confirmarDevolucion(): void {
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
                this.ventaSeleccionada.set({ ...venta, estado: 'ANULADA' });
            },
            error: () => {
                this.procesando.set(false);
                this.errorBusqueda.set('Error al procesar la devolucion. Intente nuevamente.');
            }
        });
    }

    limpiar(): void {
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
