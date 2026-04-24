import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PosVentaService } from '../../services/pos-venta.service';
import { VentaPosResponse, DetalleVentaPosResponse, DevolucionPosResponse } from '../../models/venta-pos.model';

type MotivoDevolucion = 'PRODUCTO_DEFECTUOSO' | 'PRODUCTO_INCORRECTO' | 'CAMBIO_OPINION' | 'ERROR_COBRO' | 'OTRO';

const MOTIVOS: { valor: MotivoDevolucion; etiqueta: string }[] = [
    { valor: 'PRODUCTO_DEFECTUOSO',  etiqueta: 'Producto defectuoso' },
    { valor: 'PRODUCTO_INCORRECTO',  etiqueta: 'Producto incorrecto / no solicitado' },
    { valor: 'CAMBIO_OPINION',       etiqueta: 'Cambio de opinion del cliente' },
    { valor: 'ERROR_COBRO',          etiqueta: 'Error en el cobro' },
    { valor: 'OTRO',                 etiqueta: 'Otro motivo' }
];

interface LineaDevolucion {
    detalle: DetalleVentaPosResponse;
    seleccionada: boolean;
    cantidadDevuelta: number;
    maxDevolvible: number;
    montoDevuelto: number;
}

@Component({
    selector: 'app-pos-devoluciones',
    standalone: true,
    imports: [DecimalPipe, DatePipe, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- Header -->
    <div class="mb-5">
      <h2 class="text-lg font-bold text-on">Devoluciones Parciales</h2>
      <p class="text-sm text-muted mt-0.5">Busque la venta y seleccione los items a devolver</p>
    </div>

    <!-- Buscador -->
    <form [formGroup]="formBusqueda" class="flex gap-3 items-end mb-4">
      <div class="flex-1">
        <label class="text-xs font-semibold text-subtle uppercase tracking-wide mb-1 block">N° Ticket / ID de Venta</label>
        <input class="input-field !h-10" formControlName="busqueda"
               placeholder="Ej: TICK-001000 o ID numerico"
               (keydown.enter)="buscarVenta()">
      </div>
      <div class="w-36">
        <label class="text-xs font-semibold text-subtle uppercase tracking-wide mb-1 block">Buscar por</label>
        <select class="input-field !h-10" formControlName="tipoBusqueda">
          <option value="ticket">N° Ticket</option>
          <option value="id">ID de Venta</option>
        </select>
      </div>
      <button type="button" class="btn-primary !h-10 !px-5 shrink-0" (click)="buscarVenta()" [disabled]="buscando() || !puedeBuscar()">
        @if (buscando()) {
          <svg class="animate-spin" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M10 3a7 7 0 017 7" stroke-linecap="round" />
          </svg>
        } @else {
          Buscar
        }
      </button>
    </form>

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
            <p class="text-[10px] text-muted uppercase tracking-wide">Total</p>
            <p class="text-lg font-bold text-[var(--color-primary)]">
              <span class="text-xs align-super mr-px">S/</span>{{ venta.total | number:'1.2-2' }}
            </p>
          </div>
        </div>

        <!-- Items con checkboxes para devolucion parcial -->
        @if (venta.estado === 'COMPLETADA') {
        <div class="border-t border-[var(--color-border)]">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-[var(--color-background)]">
                <th class="px-3 py-2 text-left w-8"></th>
                <th class="px-3 py-2 text-left text-[10px] font-semibold text-muted uppercase">Producto</th>
                <th class="px-3 py-2 text-center text-[10px] font-semibold text-muted uppercase w-20">Vendido</th>
                <th class="px-3 py-2 text-center text-[10px] font-semibold text-muted uppercase w-24">Devolver</th>
                <th class="px-3 py-2 text-right text-[10px] font-semibold text-muted uppercase w-28">Reembolso</th>
              </tr>
            </thead>
            <tbody>
              @for (linea of lineasDevolucion(); track linea.detalle.id) {
                <tr class="border-t border-[var(--color-border)]/50"
                    [class.bg-[var(--color-primary)]/5]="linea.seleccionada">
                  <td class="px-3 py-2 text-center">
                    <input type="checkbox" [checked]="linea.seleccionada"
                           [disabled]="linea.maxDevolvible === 0"
                           (change)="toggleLinea(linea.detalle.id)"
                           class="accent-[var(--color-primary)]">
                  </td>
                  <td class="px-3 py-2">
                    <p class="text-on">{{ linea.detalle.varianteNombre }}</p>
                    <p class="text-[10px] text-muted font-mono">{{ linea.detalle.varianteSku }}</p>
                  </td>
                  <td class="px-3 py-2 text-center text-on">{{ linea.detalle.cantidad }}</td>
                  <td class="px-3 py-2 text-center">
                    @if (linea.seleccionada && linea.maxDevolvible > 0) {
                      <div class="flex items-center justify-center gap-1">
                        <button class="w-6 h-6 rounded bg-[var(--color-border)] text-on text-xs"
                                (click)="cambiarCantidadDevolucion(linea.detalle.id, -1)">-</button>
                        <span class="w-8 text-center font-bold text-on">{{ linea.cantidadDevuelta }}</span>
                        <button class="w-6 h-6 rounded bg-[var(--color-border)] text-on text-xs"
                                (click)="cambiarCantidadDevolucion(linea.detalle.id, 1)">+</button>
                      </div>
                    } @else if (linea.maxDevolvible === 0) {
                      <span class="text-xs text-muted">Ya devuelto</span>
                    }
                  </td>
                  <td class="px-3 py-2 text-right font-mono font-semibold"
                      [class.text-[var(--color-warning)]]="linea.montoDevuelto > 0"
                      [class.text-muted]="linea.montoDevuelto === 0">
                    S/ {{ linea.montoDevuelto | number:'1.2-2' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <!-- Total devolucion -->
          <div class="flex justify-end px-4 py-3 border-t border-[var(--color-border)]">
            <div class="text-right">
              <span class="text-sm text-muted mr-3">Total a devolver:</span>
              <span class="text-xl font-bold text-[var(--color-warning)]">
                S/ {{ totalDevolucion() | number:'1.2-2' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Formulario de devolucion -->
        <form [formGroup]="formDevolucion" class="p-4 border-t border-[var(--color-border)] flex flex-col gap-4">
          <div>
            <label class="text-xs font-semibold text-subtle uppercase tracking-wide mb-1 block">Motivo *</label>
            <select class="input-field !h-10" formControlName="motivo">
              <option value="">Seleccionar motivo...</option>
              @for (m of motivos; track m.valor) {
                <option [value]="m.valor">{{ m.etiqueta }}</option>
              }
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold text-subtle uppercase tracking-wide mb-1 block">Observaciones</label>
            <textarea class="input-field" formControlName="observaciones" rows="2"
                      placeholder="Descripcion adicional..."></textarea>
          </div>

          <!-- Success message -->
          @if (procesado()) {
            <div class="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/20">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" class="text-[var(--color-success)] shrink-0">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <div class="text-sm">
                <p class="font-bold text-[var(--color-success)]">Devolucion procesada — NC: {{ ultimaNc() }}</p>
                <p class="text-subtle text-xs mt-0.5">Entregue S/ {{ totalDevolucion() | number:'1.2-2' }} al cliente.</p>
              </div>
            </div>
          }

          <div class="flex justify-end gap-3">
            <button type="button" class="btn-secondary !h-9 !px-4" (click)="limpiar()">Cancelar</button>
            <button type="button" class="!h-9 !px-5 rounded-xl text-sm font-semibold text-white transition-colors"
                [class]="!motivoSeleccionado() || !haySeleccion() || procesando() || procesado()
                  ? 'bg-[var(--color-border)] cursor-not-allowed'
                  : 'bg-[var(--color-error)] hover:brightness-110 active:brightness-90'"
                [disabled]="!motivoSeleccionado() || !haySeleccion() || procesando() || procesado()"
                (click)="confirmarDevolucion()">
              @if (procesando()) {
                <svg class="animate-spin inline mr-1" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M10 3a7 7 0 017 7" stroke-linecap="round" />
                </svg>
                Procesando...
              } @else {
                Confirmar Devolucion Parcial
              }
            </button>
          </div>
        </form>
        } @else {
          <div class="p-6 text-center border-t border-[var(--color-border)]">
            <p class="text-muted text-sm">Esta venta ya fue anulada previamente.</p>
          </div>
        }
      </div>
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
              <th class="px-4 py-2 text-left text-[10px] font-semibold text-muted uppercase">N° NC</th>
              <th class="px-4 py-2 text-right text-[10px] font-semibold text-muted uppercase">Total devuelto</th>
              <th class="px-4 py-2 text-left text-[10px] font-semibold text-muted uppercase">Motivo</th>
            </tr>
          </thead>
          <tbody>
            @for (d of devolucionesProcesadas(); track d.numeroNc) {
              <tr class="border-t border-[var(--color-border)]/50">
                <td class="px-4 py-2 font-mono text-on">{{ d.ticket }}</td>
                <td class="px-4 py-2 font-mono text-xs text-muted">{{ d.numeroNc }}</td>
                <td class="px-4 py-2 text-right font-mono font-bold text-[var(--color-warning)]">
                  S/ {{ d.totalDevuelto | number:'1.2-2' }}
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
    private readonly fb = inject(FormBuilder);

    readonly formBusqueda: FormGroup = this.fb.group({
        busqueda: [''],
        tipoBusqueda: ['ticket' as 'ticket' | 'id'],
    });

    readonly formDevolucion: FormGroup = this.fb.group({
        motivo: [''],
        observaciones: [''],
    });

    readonly motivos = MOTIVOS;
    buscando = signal(false);
    procesando = signal(false);
    procesado = signal(false);
    errorBusqueda = signal<string | null>(null);
    ventaSeleccionada = signal<VentaPosResponse | null>(null);
    lineasDevolucion = signal<LineaDevolucion[]>([]);
    ultimaNc = signal('');
    devolucionesProcesadas = signal<{ ticket: string; numeroNc: string; totalDevuelto: number; motivo: string }[]>([]);

    readonly totalDevolucion = computed(() =>
        this.lineasDevolucion()
            .filter(l => l.seleccionada)
            .reduce((sum, l) => sum + l.montoDevuelto, 0)
    );

    readonly haySeleccion = computed(() =>
        this.lineasDevolucion().some(l => l.seleccionada && l.cantidadDevuelta > 0)
    );

    /** Helpers reactivos para deshabilitar botones desde el template (OnPush). */
    puedeBuscar(): boolean {
        return !!String(this.formBusqueda.value.busqueda ?? '').trim();
    }

    motivoSeleccionado(): boolean {
        return !!this.formDevolucion.value.motivo;
    }

    buscarVenta(): void {
        const busqueda = String(this.formBusqueda.value.busqueda ?? '');
        const tipoBusqueda: 'ticket' | 'id' = this.formBusqueda.value.tipoBusqueda ?? 'ticket';
        if (!busqueda.trim()) return;
        this.buscando.set(true);
        this.errorBusqueda.set(null);
        this.ventaSeleccionada.set(null);
        this.procesado.set(false);
        this.lineasDevolucion.set([]);

        const obs = tipoBusqueda === 'id'
            ? (() => {
                  const id = parseInt(busqueda, 10);
                  if (isNaN(id)) {
                      this.errorBusqueda.set('Ingrese un ID numerico valido.');
                      this.buscando.set(false);
                      return null;
                  }
                  return this.ventaService.getRecibo(id);
              })()
            : this.ventaService.buscarPorTicket(busqueda.trim());

        if (!obs) return;

        const tipoOriginal = tipoBusqueda;
        const busquedaOriginal = busqueda;
        obs.subscribe({
            next: (v) => {
                this.ventaSeleccionada.set(v);
                this.buildLineas(v);
                this.buscando.set(false);
            },
            error: () => {
                this.errorBusqueda.set(
                    tipoOriginal === 'id'
                        ? 'No se encontro ninguna venta con ID ' + busquedaOriginal
                        : 'No se encontro ninguna venta con ticket "' + busquedaOriginal.trim() + '"'
                );
                this.buscando.set(false);
            }
        });
    }

    private buildLineas(venta: VentaPosResponse): void {
        const lineas: LineaDevolucion[] = venta.detalles.map(d => {
            const precioUnitario = d.subtotalLinea / d.cantidad;
            return {
                detalle: d,
                seleccionada: false,
                cantidadDevuelta: 0,
                maxDevolvible: d.cantidad,
                montoDevuelto: 0,
            };
        });
        this.lineasDevolucion.set(lineas);
    }

    toggleLinea(detalleId: number): void {
        this.lineasDevolucion.update(lineas =>
            lineas.map(l => {
                if (l.detalle.id !== detalleId) return l;
                const sel = !l.seleccionada;
                const qty = sel ? Math.min(1, l.maxDevolvible) : 0;
                const precioUnit = l.detalle.subtotalLinea / l.detalle.cantidad;
                return {
                    ...l,
                    seleccionada: sel,
                    cantidadDevuelta: qty,
                    montoDevuelto: +(precioUnit * qty).toFixed(2),
                };
            })
        );
    }

    cambiarCantidadDevolucion(detalleId: number, delta: number): void {
        this.lineasDevolucion.update(lineas =>
            lineas.map(l => {
                if (l.detalle.id !== detalleId || !l.seleccionada) return l;
                const newQty = Math.max(1, Math.min(l.maxDevolvible, l.cantidadDevuelta + delta));
                const precioUnit = l.detalle.subtotalLinea / l.detalle.cantidad;
                return {
                    ...l,
                    cantidadDevuelta: newQty,
                    montoDevuelto: +(precioUnit * newQty).toFixed(2),
                };
            })
        );
    }

    confirmarDevolucion(): void {
        const venta = this.ventaSeleccionada();
        const motivo = String(this.formDevolucion.value.motivo ?? '');
        const observaciones = String(this.formDevolucion.value.observaciones ?? '');
        if (!venta || !motivo) return;

        const lineas = this.lineasDevolucion()
            .filter(l => l.seleccionada && l.cantidadDevuelta > 0)
            .map(l => ({
                detalleVentaPosId: l.detalle.id,
                cantidadDevuelta: l.cantidadDevuelta,
            }));

        if (lineas.length === 0) return;
        this.procesando.set(true);

        this.ventaService.procesarDevolucion(venta.id, {
            motivo,
            observaciones: observaciones || undefined,
            lineas,
        }).subscribe({
            next: (resp) => {
                this.ultimaNc.set(resp.numeroNc);
                this.devolucionesProcesadas.update(list => [
                    ...list,
                    {
                        ticket: venta.numeroTicket,
                        numeroNc: resp.numeroNc,
                        totalDevuelto: resp.totalDevuelto,
                        motivo: this.motivoEtiqueta(),
                    }
                ]);
                this.procesado.set(true);
                this.procesando.set(false);
            },
            error: (err) => {
                this.procesando.set(false);
                const msg = err?.error?.detail ?? err?.error?.message ?? 'Error al procesar la devolucion.';
                this.errorBusqueda.set(msg);
            }
        });
    }

    limpiar(): void {
        this.formBusqueda.reset({ busqueda: '', tipoBusqueda: 'ticket' });
        this.formDevolucion.reset({ motivo: '', observaciones: '' });
        this.ventaSeleccionada.set(null);
        this.errorBusqueda.set(null);
        this.procesado.set(false);
        this.lineasDevolucion.set([]);
    }

    private motivoEtiqueta(): string {
        const motivo = String(this.formDevolucion.value.motivo ?? '');
        return MOTIVOS.find(m => m.valor === motivo)?.etiqueta ?? motivo;
    }
}
