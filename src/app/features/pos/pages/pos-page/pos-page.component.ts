import {
    Component, ChangeDetectionStrategy, OnInit, OnDestroy,
    signal, inject, ViewEncapsulation, computed,
} from '@angular/core';
import { PosCarritoService } from '../../services/pos-carrito.service';
import { PosTurnoService } from '../../services/pos-turno.service';
import { PosCatalogoService } from '../../services/pos-catalogo.service';
import { PosVentaService } from '../../services/pos-venta.service';
import { PosKeyboardService } from '../../services/pos-keyboard.service';
import { PosFavoritosService, PosFavorito } from '../../services/pos-favoritos.service';
import { PosOrdenesRetenidasService, OrdenRetenida } from '../../services/pos-ordenes-retenidas.service';
import { PosMovimientosCajaService, MovimientoCaja, MovimientoCajaRequest } from '../../services/pos-movimientos-caja.service';
import { PosGiftCardService } from '../../services/pos-gift-card.service';
import { PosOfflineSyncService } from '../../services/pos-offline-sync.service';
import { AuthService } from '@core/auth/auth.service';
import { ThemeService } from '@core/services/theme/theme';
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
import { PosDevolucionesComponent } from '../pos-devoluciones/pos-devoluciones.component';
import { PosShortcutsHelpComponent } from '../../components/pos-shortcuts-help/pos-shortcuts-help.component';
import { PosHeldOrdersPanelComponent } from '../../components/pos-held-orders-panel/pos-held-orders-panel.component';
import { PosCashMovementDialogComponent } from '../../components/pos-cash-movement-dialog/pos-cash-movement-dialog.component';
import { PosDenominationCounterComponent, CierreArqueoData } from '../../components/pos-denomination-counter/pos-denomination-counter.component';
import { PosReportViewerComponent, ReporteXZ } from '../../components/pos-report-viewer/pos-report-viewer.component';
import { PosCustomerLookupComponent } from '../../components/pos-customer-lookup/pos-customer-lookup.component';
import { PosCameraScannerComponent } from '../../components/pos-camera-scanner/pos-camera-scanner.component';
import { PosCrossStockDialogComponent } from '../../components/pos-cross-stock-dialog/pos-cross-stock-dialog.component';
import { PosPinLoginComponent } from '../../components/pos-pin-login/pos-pin-login.component';
import { PosManagerPinDialogComponent } from '../../components/pos-manager-pin-dialog/pos-manager-pin-dialog.component';

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
        PosDevolucionesComponent,
        PosShortcutsHelpComponent,
        PosHeldOrdersPanelComponent,
        PosCashMovementDialogComponent,
        PosDenominationCounterComponent,
        PosReportViewerComponent,
        PosCustomerLookupComponent,
        PosCameraScannerComponent,
        PosCrossStockDialogComponent,
        PosPinLoginComponent,
        PosManagerPinDialogComponent,
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
    readonly keyboard = inject(PosKeyboardService);
    readonly offlineSync = inject(PosOfflineSyncService);
    private readonly auth = inject(AuthService);
    private readonly themeService = inject(ThemeService);
    private readonly turnoService = inject(PosTurnoService);
    private readonly catalogoService = inject(PosCatalogoService);
    private readonly ventaService = inject(PosVentaService);
    private readonly favoritosService = inject(PosFavoritosService);
    private readonly ordenesRetenidasService = inject(PosOrdenesRetenidasService);
    private readonly movimientosCajaService = inject(PosMovimientosCajaService);
    private readonly giftCardService = inject(PosGiftCardService);

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
    readonly favoritoItems = signal<PosFavorito[]>([]);
    readonly favoritosLoading = signal(false);
    readonly ordenesRetenidas = signal<OrdenRetenida[]>([]);
    readonly movimientosCaja = signal<MovimientoCaja[]>([]);
    readonly showCashMovementDialog = signal(false);
    readonly showDenominationCounter = signal(false);
    readonly currentReporte = signal<ReporteXZ | null>(null);
    readonly showCameraScanner = signal(false);

    // Cross-stock dialog
    readonly showCrossStock = signal(false);
    readonly crossStockVarianteId = signal<number>(0);

    // PIN login guard
    readonly pinAuthenticated = signal(false);

    // Manager PIN dialog (discount authorization)
    readonly showManagerPin = signal(false);
    readonly managerPinVarianteId = signal<number>(0);

    // Customer lookup visibility
    readonly showCustomerLookup = signal(true);

    // ── Derivados ─────────────────────────────────────────────────
    readonly sinTurno = computed(() => this.turnoActivo() === null);

    // ── Reloj ─────────────────────────────────────────────────────
    readonly clockTime = signal('');
    readonly clockDate = signal('');
    private clockInterval?: ReturnType<typeof setInterval>;
    private toastTimeout?: ReturnType<typeof setTimeout>;
    private unregisterKeyboard?: () => void;

    // ── Lifecycle ─────────────────────────────────────────────────
    ngOnInit(): void {
        this.themeService.setContext('pos');
        // If user already has a session (came from admin), skip PIN
        if (this.auth.currentUser()) {
            this.pinAuthenticated.set(true);
        }
        this.startClock();
        this.loadCatalogo();
        this.loadFavoritos();
        this.loadTurnoActivo();
        this.registerKeyboardShortcuts();
    }

    ngOnDestroy(): void {
        this.themeService.setContext('shop');
        clearInterval(this.clockInterval);
        clearTimeout(this.toastTimeout);
        this.unregisterKeyboard?.();
    }

    // ── Helpers privados ──────────────────────────────────────────
    get companyId(): number {
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

    // ── Favoritos ──────────────────────────────────────────────────
    private loadFavoritos(): void {
        this.favoritosLoading.set(true);
        this.favoritosService.getFavoritos(this.companyId, this.cajeroId).subscribe({
            next: favs => {
                this.favoritoItems.set(favs);
                this.favoritosLoading.set(false);
            },
            error: () => this.favoritosLoading.set(false),
        });
    }

    addFavorito(p: ProductoCatalogoPOS): void {
        this.favoritosService.crear({
            companyId: this.companyId,
            varianteId: p.varianteId,
            cajeroId: this.cajeroId,
        }).subscribe({
            next: fav => {
                this.favoritoItems.update(list => [...list, fav]);
                this.showToast(`${p.nombre} agregado a favoritos`, 'success');
            },
            error: () => this.showToast('Error al agregar favorito', 'error'),
        });
    }

    removeFavorito(fav: PosFavorito): void {
        this.favoritosService.eliminar(fav.id).subscribe({
            next: () => {
                this.favoritoItems.update(list => list.filter(f => f.id !== fav.id));
                this.showToast(`${fav.nombre} quitado de favoritos`, 'info');
            },
            error: () => this.showToast('Error al quitar favorito', 'error'),
        });
    }

    onFavoritoSelected(fav: PosFavorito): void {
        // Convert favorito to catalog product and add to cart
        const producto: ProductoCatalogoPOS = {
            varianteId: fav.varianteId,
            sku: fav.sku,
            nombre: fav.nombre,
            nombreProducto: fav.nombre,
            categoriaId: '',
            categoria: '',
            precioBase: fav.precioFinal,
            precioAjuste: 0,
            precioFinal: fav.precioFinal,
            stockActual: fav.stockActual,
            stockMinimo: 0,
            imagenUrl: fav.imagenUrl ?? undefined,
        };
        this.carrito.agregarProducto(producto);
    }

    // ── Órdenes Retenidas (Hold/Park) ──────────────────────────────
    loadOrdenesRetenidas(): void {
        const turno = this.turnoActivo();
        if (!turno) return;
        this.ordenesRetenidasService.getRetenidas(turno.id).subscribe({
            next: ordenes => this.ordenesRetenidas.set(ordenes),
        });
    }

    holdOrder(nombre?: string): void {
        const turno = this.turnoActivo();
        if (!turno || this.carrito.isEmpty()) {
            this.showToast('No hay items para retener', 'error');
            return;
        }
        const itemsJson = JSON.stringify(this.carrito.items());
        this.ordenesRetenidasService.retener({
            turnoCajaId: turno.id,
            nombre: nombre ?? `Orden ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`,
            itemsJson,
            descuento: this.carrito.descuento(),
            clienteId: this.carrito.clienteId() ?? undefined,
            clienteNombre: this.carrito.clienteNombre() || undefined,
            metodoPago: this.carrito.metodoPago(),
        }).subscribe({
            next: () => {
                this.carrito.vaciarCarrito();
                this.loadOrdenesRetenidas();
                this.showToast('Orden retenida', 'success');
            },
            error: () => this.showToast('Error al retener orden', 'error'),
        });
    }

    restoreOrder(orden: OrdenRetenida): void {
        this.ordenesRetenidasService.recuperar(orden.id).subscribe({
            next: recovered => {
                try {
                    const items = JSON.parse(recovered.itemsJson);
                    this.carrito.vaciarCarrito();
                    for (const item of items) {
                        if (item.variante) {
                            this.carrito.agregarProducto(item.variante);
                            if (item.cantidad > 1) {
                                this.carrito.setCantidad(item.variante.varianteId, item.cantidad);
                            }
                        }
                    }
                    if (recovered.descuento) this.carrito.setDescuento(recovered.descuento);
                    if (recovered.clienteNombre) this.carrito.setCliente(recovered.clienteId, recovered.clienteNombre);
                } catch { /* ignore parse errors */ }
                this.loadOrdenesRetenidas();
                this.showScreen('main');
                this.showToast('Orden recuperada', 'success');
            },
            error: () => this.showToast('Error al recuperar orden', 'error'),
        });
    }

    discardOrder(orden: OrdenRetenida): void {
        this.ordenesRetenidasService.descartar(orden.id).subscribe({
            next: () => {
                this.ordenesRetenidas.update(list => list.filter(o => o.id !== orden.id));
                this.showToast('Orden descartada', 'info');
            },
            error: () => this.showToast('Error al descartar orden', 'error'),
        });
    }

    // ── Movimientos de Caja ──────────────────────────────────────
    loadMovimientos(): void {
        const turno = this.turnoActivo();
        if (!turno) return;
        this.movimientosCajaService.getMovimientos(turno.id).subscribe({
            next: movs => this.movimientosCaja.set(movs),
        });
    }

    registrarMovimiento(dto: MovimientoCajaRequest): void {
        const turno = this.turnoActivo();
        if (!turno) return;
        this.movimientosCajaService.registrar(turno.id, dto).subscribe({
            next: () => {
                this.showCashMovementDialog.set(false);
                this.loadMovimientos();
                this.showToast(`${dto.tipo === 'INGRESO' ? 'Ingreso' : 'Retiro'} registrado: S/${dto.monto.toFixed(2)}`, 'success');
            },
            error: () => this.showToast('Error al registrar movimiento', 'error'),
        });
    }

    // ── Cierre con Arqueo ─────────────────────────────────────────
    cerrarTurnoConArqueo(data: CierreArqueoData): void {
        const turno = this.turnoActivo();
        if (!turno) return;
        this.turnoService.cerrarTurnoConArqueo(turno.id, data).subscribe({
            next: t => {
                this.turnoActivo.set(t);
                this.showDenominationCounter.set(false);
                this.showToast('Turno cerrado con arqueo', 'success');
            },
            error: () => this.showToast('Error al cerrar turno', 'error'),
        });
    }

    // ── Reportes X/Z ─────────────────────────────────────────────
    loadReporteX(): void {
        const turno = this.turnoActivo();
        if (!turno) return;
        this.turnoService.getReporteX(turno.id).subscribe({
            next: r => {
                this.currentReporte.set(r);
                this.showScreen('reporte');
            },
            error: () => this.showToast('Error al generar reporte X', 'error'),
        });
    }

    loadReporteZ(): void {
        const turno = this.turnoActivo();
        if (!turno) return;
        this.turnoService.getReporteZ(turno.id).subscribe({
            next: r => {
                this.currentReporte.set(r);
                this.showScreen('reporte');
            },
            error: () => this.showToast('Error al generar reporte Z', 'error'),
        });
    }

    // ── PIN Login ──────────────────────────────────────────────────
    onPinAuthenticated(data: { token: string; username: string; userId: number; companyId: number }): void {
        this.pinAuthenticated.set(true);
        this.showToast(`Bienvenido, ${data.username}`, 'success');
    }

    onPinSkipped(): void {
        this.pinAuthenticated.set(true);
    }

    // ── Cross-Stock Dialog ──────────────────────────────────────
    openCrossStock(varianteId: number): void {
        this.crossStockVarianteId.set(varianteId);
        this.showCrossStock.set(true);
    }

    // ── Manager PIN (discount authorization) ─────────────────────
    requestManagerAuth(varianteId: number): void {
        this.managerPinVarianteId.set(varianteId);
        this.showManagerPin.set(true);
    }

    onManagerPinConfirmed(pin: string): void {
        // For now, accept any valid 4+ digit PIN as supervisor authorization
        // In production, validate against backend
        const varianteId = this.managerPinVarianteId();
        if (varianteId > 0) {
            this.carrito.setLineDiscount(varianteId, 'PORCENTAJE', 10, this.cajeroId);
            this.showToast('Descuento autorizado por supervisor', 'success');
        }
        this.showManagerPin.set(false);
        this.managerPinVarianteId.set(0);
    }

    // ── Gift Card ────────────────────────────────────────────────
    lookupGiftCard(codigo: string): void {
        if (!codigo || codigo.length < 4) {
            this.showToast('Ingrese el código de la gift card', 'error');
            return;
        }
        this.giftCardService.buscarPorCodigo(codigo).subscribe({
            next: card => {
                if (card.estado !== 'ACTIVA') {
                    this.showToast(`Gift card ${card.estado}`, 'error');
                    return;
                }
                if (card.saldoActual <= 0) {
                    this.showToast('Gift card sin saldo', 'error');
                    return;
                }
                const montoAplicar = Math.min(card.saldoActual, this.carrito.totalConDescuento());
                this.carrito.setGiftCard(codigo, montoAplicar);
                this.showToast(`Gift card aplicada: -S/${montoAplicar.toFixed(2)}`, 'success');
            },
            error: () => this.showToast('Gift card no encontrada', 'error'),
        });
    }

    // ── Customer Lookup ──────────────────────────────────────────
    onClientSelected(client: { id: number | null; nombre: string; numDoc: string }): void {
        this.carrito.setCliente(client.id, client.nombre || client.numDoc);
    }

    onClientCleared(): void {
        this.carrito.setCliente(null, '');
    }

    // ── Camera Scanner ─────────────────────────────────────────────
    onBarcodeScanned(code: string): void {
        this.showCameraScanner.set(false);
        this.loadCatalogo(code);
        this.showScreen('main');
    }

    // ── Búsqueda reactiva desde catálogo ─────────────────────────
    onSearchChanged(query: string): void {
        this.loadCatalogo(query);
    }

    // ── Navegación ────────────────────────────────────────────────
    showScreen(screen: PosScreen): void {
        this.activeScreen.set(screen);
        if (screen === 'historial') this.loadHistorial();
        if (screen === 'ordenes-retenidas') this.loadOrdenesRetenidas();
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

        const giftCardCodigo = this.carrito.giftCardCodigo() || undefined;

        const request = {
            turnoCajaId: turno.id,
            items: this.carrito.items().map(i => ({
                varianteId: i.variante.varianteId,
                cantidad: i.cantidad,
                descuentoTipo: i.descuentoTipo !== 'NINGUNO' ? i.descuentoTipo : undefined,
                descuentoValor: i.descuentoValor > 0 ? i.descuentoValor : undefined,
                autorizadoPor: i.autorizadoPor ?? undefined,
                bolsas: i.bolsas > 0 ? i.bolsas : undefined,
            })),
            metodoPago: giftCardCodigo ? 'GIFT_CARD' as const : this.carrito.metodoPagoPrimario(),
            tipoCpe: this.carrito.tipoCpe(),
            clienteId: this.carrito.clienteId() ?? undefined,
            clienteNombre: this.carrito.clienteNombre() || undefined,
            descuento: this.carrito.descuento() || undefined,
            montoRecibido: pagoDividido ? montoTotalPagos : (this.carrito.montoRecibido() || undefined),
            pagos: pagoDividido ? this.carrito.pagos().filter(p => p.monto > 0) : undefined,
        };

        // Offline handling: save locally if browser is offline
        if (this.offlineSync.isOffline()) {
            this.isLoading.set(true);
            this.offlineSync.saveOfflineVenta(request, this.companyId).then(offlineVenta => {
                this.carrito.vaciarCarrito();
                this.isLoading.set(false);
                this.showToast(`Venta guardada offline — ${offlineVenta.numeroTicketTemp}`, 'info');
            }).catch(() => {
                this.isLoading.set(false);
                this.showToast('Error al guardar venta offline', 'error');
            });
            return;
        }

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

    // ── Keyboard Shortcuts ─────────────────────────────────────────
    private registerKeyboardShortcuts(): void {
        this.unregisterKeyboard = this.keyboard.register(action => {
            if (action.type === 'navigate') {
                this.showScreen(action.screen);
            } else {
                switch (action.name) {
                    case 'nuevaVenta':
                        this.carrito.vaciarCarrito();
                        this.showScreen('main');
                        break;
                    case 'cobrar':
                        this.procesarVenta();
                        break;
                    case 'toggleFullscreen':
                        if (document.fullscreenElement) {
                            document.exitFullscreen();
                        } else {
                            document.documentElement.requestFullscreen();
                        }
                        break;
                    case 'toggleShortcuts':
                        this.keyboard.toggleShortcutsPanel();
                        break;
                    case 'holdOrder':
                        this.holdOrder();
                        break;
                    case 'recallOrder':
                        this.showScreen('ordenes-retenidas');
                        break;
                    case 'customerSearch':
                        this.showCustomerLookup.update(v => !v);
                        break;
                }
            }
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
