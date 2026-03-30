import {
    Component, ChangeDetectionStrategy, OnInit, OnDestroy,
    signal, inject, ViewEncapsulation, computed,
} from '@angular/core';
import { PosCarritoService } from '../../services/pos-carrito.service';
import { PosTurnoService } from '../../services/pos-turno.service';
import { PosCatalogoService } from '../../services/pos-catalogo.service';
import { PosVentaService } from '../../services/pos-venta.service';
import { AuthService } from '@core/auth/auth.service';
import { ProductoCatalogoPOS } from '../../models/catalogo-pos.model';
import { VentaPosResponse } from '../../models/venta-pos.model';
import { TurnoCaja } from '../../models/turno-caja.model';

// Sub-components
import { PosTopbarComponent, PosScreen } from '../../components/pos-topbar/pos-topbar.component';
import { PosCatalogComponent } from '../../components/pos-catalog/pos-catalog.component';
import { PosOrderPanelComponent } from '../../components/pos-order-panel/pos-order-panel.component';
import { PosNumpadComponent } from '../../components/pos-numpad/pos-numpad.component';
import { PosReceiptComponent } from '../../components/pos-receipt/pos-receipt.component';
import { PosHistorialComponent } from '../../components/pos-historial/pos-historial.component';
import { PosTurnoComponent } from '../../components/pos-turno/pos-turno.component';

@Component({
    selector: 'app-pos-page',
    standalone: true,
    imports: [
        PosTopbarComponent,
        PosCatalogComponent,
        PosOrderPanelComponent,
        PosNumpadComponent,
        PosReceiptComponent,
        PosHistorialComponent,
        PosTurnoComponent,
    ],
    templateUrl: './pos-page.component.html',
    // ViewEncapsulation.None hace que el CSS del módulo POS sea global,
    // permitiendo que los estilos se apliquen a todos los sub-componentes hijos.
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosPageComponent implements OnInit, OnDestroy {

    // ── DI ────────────────────────────────────────────────────────
    readonly carrito = inject(PosCarritoService);
    private readonly auth = inject(AuthService);
    private readonly turnoService = inject(PosTurnoService);
    private readonly catalogoService = inject(PosCatalogoService);
    private readonly ventaService = inject(PosVentaService);

    // ── UI State ──────────────────────────────────────────────────
    readonly activeScreen = signal<PosScreen>('main');
    readonly catalogoItems = signal<ProductoCatalogoPOS[]>([]);
    readonly historialItems = signal<VentaPosResponse[]>([]);
    readonly lastVenta = signal<VentaPosResponse | null>(null);
    readonly turnoActivo = signal<TurnoCaja | null>(null);
    readonly isLoading = signal(false);
    readonly isSearching = signal(false);
    readonly backendError = signal(false);   // true cuando ECONNREFUSED o backend caído
    readonly toastMsg = signal('');
    readonly toastVisible = signal(false);
    readonly toastType = signal<'info' | 'error' | 'success'>('info');

    // ── Derivados ─────────────────────────────────────────────────
    readonly sinTurno = computed(() => this.turnoActivo() === null);

    // ── Reloj ─────────────────────────────────────────────────────
    readonly clockTime = signal('');
    readonly clockDate = signal('');
    private clockInterval?: ReturnType<typeof setInterval>;
    private toastTimeout?: ReturnType<typeof setTimeout>;

    // ── Lifecycle ─────────────────────────────────────────────────
    ngOnInit(): void {
        this.startClock();
        this.loadCatalogo();
        this.loadTurnoActivo();
    }

    ngOnDestroy(): void {
        clearInterval(this.clockInterval);
        clearTimeout(this.toastTimeout);
    }

    // ── Helpers privados ──────────────────────────────────────────
    private get companyId(): number {
        return this.auth.currentUser()?.activeCompanyId ?? 1;
    }

    private get cajeroId(): number {
        return this.auth.currentUser()?.userId ?? 1;
    }

    private startClock(): void {
        const tick = () => {
            const now = new Date();
            this.clockTime.set(now.toLocaleTimeString('es-PE', { hour12: false }));
            this.clockDate.set(
                now.toLocaleDateString('es-PE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
            );
        };
        tick();
        this.clockInterval = setInterval(tick, 1000);
    }

    private loadCatalogo(query?: string): void {
        if (!query) this.isLoading.set(true);
        else this.isSearching.set(true);

        this.catalogoService.getCatalogo(this.companyId, query || undefined).subscribe({
            next: page => {
                this.catalogoItems.set(page.content);
                this.backendError.set(false);
                this.isLoading.set(false);
                this.isSearching.set(false);
            },
            error: () => {
                this.isLoading.set(false);
                this.isSearching.set(false);
                this.backendError.set(true);
                this.showToast('Backend no disponible — verifica que microshopventas esté activo', 'error');
            },
        });
    }

    private loadTurnoActivo(): void {
        this.turnoService.getTurnoActivo(this.cajeroId).subscribe({
            next: turno => this.turnoActivo.set(turno), // null si no hay turno (manejado por el servicio)
        });
    }

    private loadHistorial(): void {
        const turno = this.turnoActivo();
        if (!turno) return;
        this.ventaService.getHistorial(turno.id).subscribe({
            next: page => this.historialItems.set(page.content),
            error: () => this.showToast('Error al cargar el historial'),
        });
    }

    // ── Búsqueda reactiva desde catálogo ─────────────────────────
    onSearchChanged(query: string): void {
        this.loadCatalogo(query);
    }

    // ── Navegación ────────────────────────────────────────────────
    showScreen(screen: PosScreen): void {
        this.activeScreen.set(screen);
        if (screen === 'historial') this.loadHistorial();
        if (screen === 'turno' && this.turnoActivo()) {
            this.turnoService
                .getResumenTurno(this.turnoActivo()!.id)
                .subscribe(t => this.turnoActivo.set(t));
        }
    }

    // ── Venta ─────────────────────────────────────────────────────
    procesarVenta(): void {
        if (this.carrito.isEmpty()) {
            this.showToast('Agrega productos al pedido');
            return;
        }
        // Guard: si no hay turno activo, redirigir a la pantalla de turno
        const turno = this.turnoActivo();
        if (!turno) {
            this.showToast('Debes abrir un turno para operar', 'error');
            this.showScreen('turno');
            return;
        }

        // En pago dividido: validar que los montos cubran el total
        if (this.carrito.pagoDividido() && this.carrito.faltaPorCubrir() > 0.01) {
            this.showToast(`Faltan S/${this.carrito.faltaPorCubrir().toFixed(2)} por cubrir`, 'error');
            return;
        }

        const pagoDividido = this.carrito.pagoDividido();
        const montoTotalPagos = pagoDividido
            ? this.carrito.pagos().reduce((s, p) => s + p.monto, 0)
            : undefined;

        const request = {
            turnoCajaId: turno.id,
            items: this.carrito.items().map(i => ({
                varianteId: i.variante.varianteId,
                cantidad: i.cantidad,
            })),
            metodoPago: this.carrito.metodoPagoPrimario(),
            tipoCpe: this.carrito.tipoCpe(),
            clienteId: this.carrito.clienteId() ?? undefined,
            clienteNombre: this.carrito.clienteNombre() || undefined,
            descuento: this.carrito.descuento() || undefined,
            montoRecibido: pagoDividido ? montoTotalPagos : (this.carrito.montoRecibido() || undefined),
            pagos: pagoDividido ? this.carrito.pagos().filter(p => p.monto > 0) : undefined,
        };

        this.isLoading.set(true);
        this.ventaService.procesarVenta(request).subscribe({
            next: venta => {
                this.lastVenta.set(venta);
                this.carrito.vaciarCarrito();
                this.isLoading.set(false);
                this.showScreen('recibo');
                this.showToast(`Venta registrada — ${venta.numeroCpe ?? venta.numeroTicket}`, 'success');
            },
            error: err => {
                this.isLoading.set(false);
                this.showToast(err.message ?? 'Error al procesar la venta', 'error');
            },
        });
    }

    // ── Turno ─────────────────────────────────────────────────────
    abrirTurno(): void {
        this.turnoService
            .abrirTurno({ cajeroId: this.cajeroId, companyId: this.companyId, montoApertura: 500 })
            .subscribe({
                next: turno => {
                    this.turnoActivo.set(turno);
                    this.showToast('Turno abierto correctamente', 'success');
                    // Volver a la pantalla principal tras abrir turno
                    this.showScreen('main');
                },
                error: err => this.showToast(err.message ?? 'Error al abrir turno', 'error'),
            });
    }

    cerrarTurno(): void {
        const turno = this.turnoActivo();
        if (!turno) return;
        this.turnoService.cerrarTurno(turno.id).subscribe({
            next: t => {
                this.turnoActivo.set(t);
                this.showToast('Turno cerrado', 'info');
            },
            error: err => this.showToast(err.message ?? 'Error al cerrar turno', 'error'),
        });
    }

    // ── Toast ─────────────────────────────────────────────────────
    showToast(msg: string, type: 'info' | 'error' | 'success' = 'info'): void {
        this.toastMsg.set(msg);
        this.toastType.set(type);
        this.toastVisible.set(true);
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => this.toastVisible.set(false), 3500);
    }
}
