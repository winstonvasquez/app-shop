import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CatalogSelectComponent } from '@shared/components';
import { PosVentaService, PosDevolucionFiltros } from '../../services/pos-venta.service';
import { VentaPosResponse, DetalleVentaPosResponse, DevolucionPosResponse } from '../../models/venta-pos.model';
import { CatalogService } from '@core/services/catalog.service';
import { AuthService } from '@core/auth/auth.service';
import { UserService } from '@features/admin/services/user.service';
import { UserResponse } from '@features/admin/models/user.model';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';

/** Estado propio de la devolución (no de la venta) — enum fijo del backend, sin catálogo. */
const ESTADOS_DEVOLUCION: { value: string; label: string }[] = [
    { value: 'PROCESADA', label: 'Procesada' },
    { value: 'ANULADA', label: 'Anulada' },
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
    imports: [DecimalPipe, DatePipe, ReactiveFormsModule, CatalogSelectComponent],
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
        <app-catalog-select class="input-field !h-10" tabla="TIPO_BUSQUEDA_VENTA" formControlName="tipoBusqueda"></app-catalog-select>
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
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-4">
        
        <!-- Columna Izquierda: Detalle de venta y Tabla de items -->
        <div class="lg:col-span-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
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
          <div class="border-t border-[var(--color-border)] overflow-y-auto max-h-[380px]">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-[var(--color-background)] sticky top-0 z-10 border-b border-[var(--color-border)]">
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
                      <p class="text-on font-medium">{{ linea.detalle.varianteNombre }}</p>
                      <p class="text-[10px] text-muted font-mono">{{ linea.detalle.varianteSku }}</p>
                    </td>
                    <td class="px-3 py-2 text-center text-on">{{ linea.detalle.cantidad }}</td>
                    <td class="px-3 py-2 text-center">
                      @if (linea.seleccionada && linea.maxDevolvible > 0) {
                        <div class="flex items-center justify-center gap-1">
                          <button class="w-6 h-6 rounded bg-[var(--color-border)] text-on text-xs hover:bg-[var(--color-border)]/80"
                                  (click)="cambiarCantidadDevolucion(linea.detalle.id, -1)">-</button>
                          <span class="w-8 text-center font-bold text-on">{{ linea.cantidadDevuelta }}</span>
                          <button class="w-6 h-6 rounded bg-[var(--color-border)] text-on text-xs hover:bg-[var(--color-border)]/80"
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
          </div>
          } @else {
            <div class="p-6 text-center border-t border-[var(--color-border)]">
              <p class="text-muted text-sm">Esta venta ya fue anulada previamente.</p>
            </div>
          }
        </div>
  
        <!-- Columna Derecha: Formulario de devolucion -->
        <div class="flex flex-col gap-4">
          @if (venta.estado === 'COMPLETADA') {
          <form [formGroup]="formDevolucion" class="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 flex flex-col gap-4">
            <h3 class="font-bold text-on text-sm border-b border-[var(--color-border)] pb-2">Resumen de Reembolso</h3>
            
            <!-- Total devolucion -->
            <div class="flex justify-between items-center py-2 bg-[var(--color-warning)]/10 px-3 rounded-lg border border-[var(--color-warning)]/20">
              <span class="text-xs font-semibold text-[var(--color-warning)] uppercase tracking-wider">Total Reembolso:</span>
              <span class="text-xl font-bold text-[var(--color-warning)] font-mono">
                S/ {{ totalDevolucion() | number:'1.2-2' }}
              </span>
            </div>

            <div>
              <label class="text-xs font-semibold text-subtle uppercase tracking-wide mb-1 block">Motivo *</label>
              <app-catalog-select class="input-field !h-10" tabla="MOTIVO_DEVOLUCION_POS" formControlName="motivo"
                  placeholder="Seleccionar motivo..."></app-catalog-select>
            </div>
            <div>
              <label class="text-xs font-semibold text-subtle uppercase tracking-wide mb-1 block">Observaciones</label>
              <textarea class="input-field" formControlName="observaciones" rows="2"
                        placeholder="Descripción adicional..."></textarea>
            </div>
  
            <!-- Success message -->
            @if (procesado()) {
              <div class="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/20">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" class="text-[var(--color-success)] shrink-0">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <div class="text-sm">
                  <p class="font-bold text-[var(--color-success)]">Devolución procesada — NC: {{ ultimaNc() }}</p>
                  <p class="text-subtle text-xs mt-0.5">Entregue S/ {{ totalDevolucion() | number:'1.2-2' }} al cliente.</p>
                </div>
              </div>
            }
  
            <div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button type="button" class="btn-secondary !h-9 !px-4" (click)="limpiar()">Cancelar</button>
              <button type="button" class="!h-9 !px-4 rounded-xl text-xs font-semibold text-white transition-colors"
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
                  Confirmar Devolución
                }
              </button>
            </div>
          </form>
          }
        </div>
      </div>
    }

    <!-- Listado de devoluciones registradas — 100% server-side (GET /api/pos/devoluciones) -->
    <div class="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden mt-4">
      <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <h3 class="font-bold text-on text-sm">Devoluciones registradas</h3>
        <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-border)] text-on">
          {{ devolucionesTotal() }}
        </span>
      </div>

      <!-- Filtros server-side -->
      <div class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
        <input class="input-field !h-9 !w-48" type="text" placeholder="Buscar por N° ticket..."
            [value]="dFilterSearch()" (input)="onDevSearch($any($event.target).value)" />

        <select class="input-field !h-9 !w-44" [value]="dFilterMotivo()" (change)="onDevMotivoChange($any($event.target).value)">
          <option value="">Todos los motivos</option>
          @for (m of motivosCatalogo(); track m.codigo) {
            <option [value]="m.codigo">{{ m.valor }}</option>
          }
        </select>

        <select class="input-field !h-9 !w-36" [value]="dFilterEstado()" (change)="onDevEstadoChange($any($event.target).value)">
          <option value="">Todos los estados</option>
          @for (e of estadosDevolucion; track e.value) {
            <option [value]="e.value">{{ e.label }}</option>
          }
        </select>

        <select class="input-field !h-9 !w-44" [value]="dFilterCajeroId()" (change)="onDevCajeroChange($any($event.target).value)">
          <option value="">Todos los cajeros</option>
          @for (c of cajeros(); track c.id) {
            <option [value]="c.id">{{ c.persona.nombreCompleto }}</option>
          }
        </select>

        <label class="text-[10px] text-muted uppercase tracking-wide">Devolución</label>
        <input class="input-field !h-9" type="date" [value]="dFilterFechaDevDesde()"
            (change)="onDevFechaDevDesdeChange($any($event.target).value)" title="Devolución desde" />
        <input class="input-field !h-9" type="date" [value]="dFilterFechaDevHasta()"
            (change)="onDevFechaDevHastaChange($any($event.target).value)" title="Devolución hasta" />

        <label class="text-[10px] text-muted uppercase tracking-wide">Venta</label>
        <input class="input-field !h-9" type="date" [value]="dFilterFechaVentaDesde()"
            (change)="onDevFechaVentaDesdeChange($any($event.target).value)" title="Venta desde" />
        <input class="input-field !h-9" type="date" [value]="dFilterFechaVentaHasta()"
            (change)="onDevFechaVentaHastaChange($any($event.target).value)" title="Venta hasta" />

        @if (hasDevFiltrosActivos()) {
          <button type="button" class="btn-secondary !h-9 !px-3 text-xs" (click)="onDevFiltersClear()">Limpiar</button>
        }
      </div>

      @if (devolucionesLoading()) {
        <div class="flex justify-center py-6">
          <svg class="animate-spin text-[var(--color-primary)]" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path d="M10 3a7 7 0 017 7" stroke-linecap="round" />
          </svg>
        </div>
      } @else {
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[var(--color-background)]">
              <th class="px-4 py-2 text-left text-[10px] font-semibold text-muted uppercase">Venta</th>
              <th class="px-4 py-2 text-left text-[10px] font-semibold text-muted uppercase">N° NC</th>
              <th class="px-4 py-2 text-right text-[10px] font-semibold text-muted uppercase">Total devuelto</th>
              <th class="px-4 py-2 text-left text-[10px] font-semibold text-muted uppercase">Motivo</th>
              <th class="px-4 py-2 text-left text-[10px] font-semibold text-muted uppercase">Estado</th>
              <th class="px-4 py-2 text-left text-[10px] font-semibold text-muted uppercase">Fecha</th>
            </tr>
          </thead>
          <tbody>
            @for (d of devolucionesListado(); track d.id) {
              <tr class="border-t border-[var(--color-border)]/50">
                <td class="px-4 py-2 font-mono text-on">Venta #{{ d.ventaPosId }}</td>
                <td class="px-4 py-2 font-mono text-xs text-muted">{{ d.numeroNc }}</td>
                <td class="px-4 py-2 text-right font-mono font-bold text-[var(--color-warning)]">
                  S/ {{ d.totalDevuelto | number:'1.2-2' }}
                </td>
                <td class="px-4 py-2 text-xs text-muted">{{ catalog.label('MOTIVO_DEVOLUCION_POS', d.motivo) }}</td>
                <td class="px-4 py-2 text-xs">
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                      [class]="d.estado === 'PROCESADA' ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]' : 'bg-[var(--color-error)]/15 text-[var(--color-error)]'">
                    {{ d.estado }}
                  </span>
                </td>
                <td class="px-4 py-2 text-xs text-muted">{{ d.fechaCreacion | date:'dd/MM/yyyy HH:mm' }}</td>
              </tr>
            }
            @empty {
              <tr>
                <td colspan="6" class="px-4 py-6 text-center text-muted text-sm">No hay devoluciones registradas</td>
              </tr>
            }
          </tbody>
        </table>

        <div class="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)] text-xs text-muted">
          <span>Página {{ devolucionesPage() + 1 }} de {{ devolucionesTotalPages() || 1 }}</span>
          <div class="flex gap-2">
            <button type="button" class="btn-secondary !h-8 !px-3 text-xs" [disabled]="devolucionesPage() === 0"
                (click)="onDevPageChange(devolucionesPage() - 1)">Anterior</button>
            <button type="button" class="btn-secondary !h-8 !px-3 text-xs" [disabled]="devolucionesPage() + 1 >= devolucionesTotalPages()"
                (click)="onDevPageChange(devolucionesPage() + 1)">Siguiente</button>
          </div>
        </div>
      }
    </div>
  `
})
export class PosDevolucionesComponent implements OnInit {
    private readonly ventaService = inject(PosVentaService);
    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    private readonly userService = inject(UserService);
    readonly catalog = inject(CatalogService);

    readonly formBusqueda: FormGroup = this.fb.group({
        busqueda: [''],
        tipoBusqueda: ['ticket' as 'ticket' | 'id'],
    });

    readonly formDevolucion: FormGroup = this.fb.group({
        motivo: [''],
        observaciones: [''],
    });

    buscando = signal(false);
    procesando = signal(false);
    procesado = signal(false);
    errorBusqueda = signal<string | null>(null);
    ventaSeleccionada = signal<VentaPosResponse | null>(null);
    lineasDevolucion = signal<LineaDevolucion[]>([]);
    ultimaNc = signal('');

    // ── Listado de devoluciones registradas (server-side) ──────────────
    readonly motivosCatalogo = this.catalog.options('MOTIVO_DEVOLUCION_POS');
    readonly estadosDevolucion = ESTADOS_DEVOLUCION;
    readonly cajeros = signal<UserResponse[]>([]);

    readonly devolucionesListado = signal<DevolucionPosResponse[]>([]);
    readonly devolucionesLoading = signal(false);
    readonly devolucionesPage = signal(0);
    readonly devolucionesTotalPages = signal(0);
    readonly devolucionesTotal = signal(0);

    readonly dFilterSearch = signal('');
    readonly dFilterMotivo = signal('');
    readonly dFilterEstado = signal('');
    readonly dFilterCajeroId = signal('');
    readonly dFilterFechaDevDesde = signal('');
    readonly dFilterFechaDevHasta = signal('');
    readonly dFilterFechaVentaDesde = signal('');
    readonly dFilterFechaVentaHasta = signal('');

    readonly hasDevFiltrosActivos = computed(() =>
        !!(this.dFilterSearch() || this.dFilterMotivo() || this.dFilterEstado() || this.dFilterCajeroId()
            || this.dFilterFechaDevDesde() || this.dFilterFechaDevHasta()
            || this.dFilterFechaVentaDesde() || this.dFilterFechaVentaHasta())
    );

    ngOnInit(): void {
        this.userService.getAllSimple().subscribe({
            next: users => this.cajeros.set(users ?? []),
            error: () => this.cajeros.set([]),
        });
        this.loadDevoluciones();
    }

    private get companyId(): number {
        return this.auth.currentUser()?.activeCompanyId ?? 1;
    }

    loadDevoluciones(): void {
        this.devolucionesLoading.set(true);
        const filtros: PosDevolucionFiltros = {
            search: this.dFilterSearch() || undefined,
            motivo: this.dFilterMotivo() || undefined,
            estado: this.dFilterEstado() || undefined,
            cajeroId: this.dFilterCajeroId() ? Number(this.dFilterCajeroId()) : undefined,
            fechaDevolucionDesde: this.dFilterFechaDevDesde() || undefined,
            fechaDevolucionHasta: this.dFilterFechaDevHasta() || undefined,
            fechaCreacionDesde: this.dFilterFechaVentaDesde() || undefined,
            fechaCreacionHasta: this.dFilterFechaVentaHasta() || undefined,
        };
        this.ventaService.getDevoluciones(this.companyId, filtros, this.devolucionesPage()).subscribe({
            next: page => {
                this.devolucionesListado.set(page.content ?? []);
                this.devolucionesTotal.set(pageTotalElements(page));
                this.devolucionesTotalPages.set(pageTotalPages(page));
                this.devolucionesLoading.set(false);
            },
            error: () => {
                this.devolucionesListado.set([]);
                this.devolucionesLoading.set(false);
            },
        });
    }

    onDevSearch(value: string): void {
        this.dFilterSearch.set(value);
        this.devolucionesPage.set(0);
        this.loadDevoluciones();
    }

    onDevMotivoChange(value: string): void {
        this.dFilterMotivo.set(value);
        this.devolucionesPage.set(0);
        this.loadDevoluciones();
    }

    onDevEstadoChange(value: string): void {
        this.dFilterEstado.set(value);
        this.devolucionesPage.set(0);
        this.loadDevoluciones();
    }

    onDevCajeroChange(value: string): void {
        this.dFilterCajeroId.set(value);
        this.devolucionesPage.set(0);
        this.loadDevoluciones();
    }

    onDevFechaDevDesdeChange(value: string): void {
        this.dFilterFechaDevDesde.set(value);
        this.devolucionesPage.set(0);
        this.loadDevoluciones();
    }

    onDevFechaDevHastaChange(value: string): void {
        this.dFilterFechaDevHasta.set(value);
        this.devolucionesPage.set(0);
        this.loadDevoluciones();
    }

    onDevFechaVentaDesdeChange(value: string): void {
        this.dFilterFechaVentaDesde.set(value);
        this.devolucionesPage.set(0);
        this.loadDevoluciones();
    }

    onDevFechaVentaHastaChange(value: string): void {
        this.dFilterFechaVentaHasta.set(value);
        this.devolucionesPage.set(0);
        this.loadDevoluciones();
    }

    /** "Limpiar filtros": resetea todo y recarga UNA sola vez. */
    onDevFiltersClear(): void {
        this.dFilterSearch.set('');
        this.dFilterMotivo.set('');
        this.dFilterEstado.set('');
        this.dFilterCajeroId.set('');
        this.dFilterFechaDevDesde.set('');
        this.dFilterFechaDevHasta.set('');
        this.dFilterFechaVentaDesde.set('');
        this.dFilterFechaVentaHasta.set('');
        this.devolucionesPage.set(0);
        this.loadDevoluciones();
    }

    onDevPageChange(page: number): void {
        if (page < 0 || page >= this.devolucionesTotalPages()) return;
        this.devolucionesPage.set(page);
        this.loadDevoluciones();
    }

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
                // El listado real (server-side) reemplaza al viejo signal de sesión: recargar para reflejar la NC recién emitida.
                this.devolucionesPage.set(0);
                this.loadDevoluciones();
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
}
