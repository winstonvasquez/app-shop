import {
    Component, ChangeDetectionStrategy, OnInit, OnDestroy,
    signal, inject, ViewEncapsulation, computed,
} from '@angular/core';
import { PosCarritoService } from '../../services/pos-carrito.service';
import { PosTurnoService } from '../../services/pos-turno.service';
import { PosCatalogoService, PosCatalogoFiltros } from '../../services/pos-catalogo.service';
import { PosVentaService, PosHistorialFiltros } from '../../services/pos-venta.service';
import { PosKeyboardService } from '../../services/pos-keyboard.service';
import { PosFavoritosService, PosFavorito } from '../../services/pos-favoritos.service';
import { PosOrdenesRetenidasService, OrdenRetenida } from '../../services/pos-ordenes-retenidas.service';
import { PosMovimientosCajaService, MovimientoCaja, MovimientoCajaRequest } from '../../services/pos-movimientos-caja.service';
import { PosGiftCardService } from '../../services/pos-gift-card.service';
import { PosOfflineSyncService } from '../../services/pos-offline-sync.service';
import { PosManagerAuthService } from '../../services/pos-manager-auth.service';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '@core/auth/auth.service';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';
import { ThemeService } from '@core/services/theme/theme';
import { ProductoCatalogoPOS, DescuentoTipo } from '../../models/catalogo-pos.model';
import { VentaPosResponse } from '../../models/venta-pos.model';
import { TurnoCaja } from '../../models/turno-caja.model';
import { construirVentaPosRequest, errorFacturaSinRuc, tipoDocSunat } from './pos-page.venta-request';
import { itemsDeOrdenRetenida } from './pos-page.orden-retenida';

// Sub-components
import { PosTopbarComponent, PosScreen } from '../../components/pos-topbar/pos-topbar.component';
import { PosCatalogComponent, PosCatalogFiltro } from '../../components/pos-catalog/pos-catalog.component';
import { PosOrderPanelComponent } from '../../components/pos-order-panel/pos-order-panel.component';
import { PosNumpadComponent } from '../../components/pos-numpad/pos-numpad.component';
import { PosReceiptComponent } from '../../components/pos-receipt/pos-receipt.component';
import { PosHistorialComponent, PosHistorialFiltro } from '../../components/pos-historial/pos-historial.component';
import { PosTurnoComponent } from '../../components/pos-turno/pos-turno.component';
import { PosDevolucionesComponent } from '../pos-devoluciones/pos-devoluciones.component';
import { PosShortcutsHelpComponent } from '../../components/pos-shortcuts-help/pos-shortcuts-help.component';
import { PosHeldOrdersPanelComponent } from '../../components/pos-held-orders-panel/pos-held-orders-panel.component';
import { PosCashMovementDialogComponent } from '../../components/pos-cash-movement-dialog/pos-cash-movement-dialog.component';
import { PosDenominationCounterComponent, CierreArqueoData } from '../../components/pos-denomination-counter/pos-denomination-counter.component';
import { PosReportViewerComponent, ReporteXZ } from '../../components/pos-report-viewer/pos-report-viewer.component';
import { PosCustomerLookupComponent } from '../../components/pos-customer-lookup/pos-customer-lookup.component';
import { PosCameraScannerComponent } from '../../components/pos-camera-scanner/pos-camera-scanner.component';
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
    private readonly route = inject(ActivatedRoute);
    private readonly themeService = inject(ThemeService);
    private readonly turnoService = inject(PosTurnoService);
    private readonly catalogoService = inject(PosCatalogoService);
    private readonly ventaService = inject(PosVentaService);
    private readonly favoritosService = inject(PosFavoritosService);
    private readonly ordenesRetenidasService = inject(PosOrdenesRetenidasService);
    private readonly movimientosCajaService = inject(PosMovimientosCajaService);
    private readonly giftCardService = inject(PosGiftCardService);
    private readonly managerAuth = inject(PosManagerAuthService);

    // ── UI State ──────────────────────────────────────────────────
    // Ruta 'pos/devoluciones' (enlazada desde admin-sidebar) llega con
    // data.initialScreen = 'devoluciones' para abrir el shell del POS directamente
    // en esa screen, en vez de 'main'.
    readonly activeScreen = signal<PosScreen>(
        (this.route.snapshot.data['initialScreen'] as PosScreen | undefined) ?? 'main'
    );
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
    /** Orden retenida en proceso de recuperación (una a la vez; evita recuperarla dos veces). */
    readonly recuperandoId = signal<number | null>(null);
    /** Tope (%) de descuento sin PIN de supervisor: lo da la config de la empresa; 10 sólo si la consulta falla. */
    readonly maxDescuentoSinAuth = signal(10);

    /** Filtros avanzados del catálogo POS (marca/unidad/disponibilidad) — server-side, emitidos por pos-catalog. */
    private catalogoFiltros: PosCatalogoFiltros = {};
    /** Último término de búsqueda, para no perderlo al cambiar un filtro avanzado. */
    private currentQuery = '';
    /** Filtros avanzados del historial de ventas del turno (server-side). */
    private historialFiltros: PosHistorialFiltros = {};

    // Cross-stock dialog

    // PIN login guard
    readonly pinAuthenticated = signal(false);

    // Manager PIN dialog (discount authorization)
    readonly showManagerPin = signal(false);
    readonly managerPinError = signal('');
    readonly managerPinLoading = signal(false);
    private readonly pendingDiscount = signal<{ varianteId: number; tipo: DescuentoTipo; valor: number } | null>(null);
    /** Venta cuya anulación espera autorización por PIN de supervisor. */
    private readonly pendingAnularVentaId = signal<number | null>(null);

    // Customer lookup visibility
    readonly showCustomerLookup = signal(true);

    // ── Derivados ─────────────────────────────────────────────────
    readonly sinTurno = computed(() => this.turnoActivo() === null);
    /** Empresa y cajero de la sesión. Sin ellos no se opera: nunca se asume la empresa/cajero 1. */
    readonly sesion = computed(() => {
        const u = this.auth.currentUser();
        return u?.activeCompanyId != null && u.userId != null
            ? { companyId: u.activeCompanyId, cajeroId: u.userId }
            : null;
    });

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
        if (!this.sesion()) return; // la plantilla muestra el aviso «sin sesión»; nada se carga ni se opera
        this.loadCatalogo();
        this.loadFavoritos();
        this.loadTurnoActivo();
        this.loadMaxDescuento();
        this.registerKeyboardShortcuts();
        // Reintenta al cargar las ventas offline que quedaron pendientes/en error (antes sólo en el evento `online`).
        void this.offlineSync.syncAll();
    }

    ngOnDestroy(): void {
        this.themeService.setContext('shop');
        clearInterval(this.clockInterval);
        clearTimeout(this.toastTimeout);
        this.unregisterKeyboard?.();
    }

    // ── Helpers privados ──────────────────────────────────────────
    // Sólo se leen con sesión: la plantilla del POS y ngOnInit están protegidos por `sesion()`.
    get companyId(): number {
        return this.sesion()!.companyId;
    }

    private get cajeroId(): number {
        return this.sesion()!.cajeroId;
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
        if (query !== undefined) this.currentQuery = query;
        const q = this.currentQuery;
        if (!q) this.isLoading.set(true);
        else this.isSearching.set(true);

        this.catalogoService.getCatalogo(this.companyId, { ...this.catalogoFiltros, q: q || undefined }).subscribe({
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
            next: turno => {
                this.turnoActivo.set(turno); // null si no hay turno (manejado por el servicio)
                // Pre-cargar el conteo de órdenes retenidas para el badge del sidenav
                if (turno) this.loadOrdenesRetenidas();
            },
            // Sólo el 404 es «sin turno» (lo resuelve el servicio): un 500/timeout se muestra, no se disfraza.
            error: err => this.showToast(this.mensajeError(err, 'No se pudo consultar el turno activo'), 'error'),
        });
    }

    private loadMaxDescuento(): void {
        this.ventaService.getMaxDescuentoSinAutorizacion(this.companyId).subscribe({
            next: max => {
                const n = Number(max);
                if (Number.isFinite(n)) this.maxDescuentoSinAuth.set(n);
            },
            error: () => this.showToast('No se pudo leer el tope de descuento de la empresa; se usa 10%', 'info'),
        });
    }

    private loadHistorial(): void {
        const turno = this.turnoActivo();
        if (!turno) return;
        this.ventaService.getHistorial(turno.id, this.historialFiltros).subscribe({
            next: page => this.historialItems.set(page.content),
            error: () => this.showToast('Error al cargar el historial'),
        });
    }

    /** Filtros del historial emitidos por pos-historial: recarga server-side. */
    onHistorialFiltersChanged(filtros: PosHistorialFiltro): void {
        this.historialFiltros = { ...filtros };
        this.loadHistorial();
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
        if (this.recuperandoId() !== null) return;
        this.recuperandoId.set(orden.id);
        this.ordenesRetenidasService.recuperar(orden.id).subscribe({
            next: recovered => {
                this.recuperandoId.set(null);
                // Ya no es RETENIDA en el backend: sale de la lista pase lo que pase con el contenido.
                this.ordenesRetenidas.update(list => list.filter(o => o.id !== orden.id));
                const items = itemsDeOrdenRetenida(recovered.itemsJson);
                if (!items) {
                    this.showToast('La orden se recuperó pero su contenido no es legible', 'error');
                    return;
                }
                this.carrito.vaciarCarrito();
                // Las líneas guardadas ya traen descuento de línea, autorizador y bolsas: se restauran enteras.
                this.carrito.items.set(items);
                if (recovered.descuento) this.carrito.setDescuento(recovered.descuento);
                // parcial: el backend sólo guarda clienteId/clienteNombre; tipo y n° de documento (y tipoCpe) se pierden.
                if (recovered.clienteNombre) this.carrito.setCliente(recovered.clienteId, recovered.clienteNombre);
                this.loadOrdenesRetenidas();
                this.showScreen('main');
                this.showToast('Orden recuperada', 'success');
            },
            error: err => {
                this.recuperandoId.set(null);
                this.showToast(this.mensajeError(err, 'Error al recuperar orden'), 'error');
            },
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
    /**
     * true (y avisa) si el turno tiene ventas offline sin sincronizar: cerrarlo las dejaría fallando
     * para siempre con `turno.not.open` (venta cobrada sin registro, sin stock ni CPE).
     */
    private async cierreBloqueadoPorOffline(turnoId: number): Promise<boolean> {
        try {
            const n = await this.offlineSync.pendientesDeTurno(turnoId);
            if (n === 0) return false;
            this.showToast(
                `Hay ${n} venta(s) offline de este turno sin sincronizar. Usa «Reintentar sincronización» antes de cerrarlo.`,
                'error');
        } catch {
            this.showToast('No se pudo verificar la cola de ventas offline; reintenta.', 'error');
        }
        return true;
    }

    abrirCierreArqueo(): void {
        const turno = this.turnoActivo();
        if (!turno) return;
        void this.cierreBloqueadoPorOffline(turno.id).then(bloqueado => {
            if (!bloqueado) this.showDenominationCounter.set(true);
        });
    }

    cerrarTurnoConArqueo(data: CierreArqueoData): void {
        const turno = this.turnoActivo();
        if (!turno) return;
        this.turnoService.cerrarTurnoConArqueo(turno.id, data).subscribe({
            next: t => {
                // El turno devuelto ya está CERRADO: sin null, `sinTurno` nunca se activa.
                this.turnoActivo.set(t.estado === 'ABIERTO' ? t : null);
                this.showDenominationCounter.set(false);
                this.showToast('Turno cerrado con arqueo', 'success');
                if (t.estado !== 'ABIERTO') this.mostrarReporteZ(turno.id);
            },
            error: err => this.showToast(this.mensajeError(err, 'Error al cerrar turno'), 'error'),
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

    /** El Z sólo existe para turnos CERRADOS (el backend da 400 con el turno abierto): se muestra al cerrar. */
    private mostrarReporteZ(turnoId: number): void {
        this.turnoService.getReporteZ(turnoId).subscribe({
            next: r => {
                this.currentReporte.set(r);
                this.showScreen('reporte');
            },
            error: err => this.showToast(
                this.mensajeError(err, 'Turno cerrado, pero no se pudo generar el reporte Z'), 'error'),
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

    // ── Manager PIN (discount authorization) ─────────────────────
    /** Un descuento de línea superó el umbral del cajero: solicitar PIN de supervisor. */
    requestSupervisorAuth(detail: { varianteId: number; tipo: DescuentoTipo; valor: number }): void {
        this.pendingDiscount.set(detail);
        this.managerPinError.set('');
        this.showManagerPin.set(true);
    }

    /** Una venta requiere anulación: solicitar PIN de supervisor antes de revertirla. */
    requestAnularVenta(ventaId: number): void {
        this.pendingDiscount.set(null);
        this.pendingAnularVentaId.set(ventaId);
        this.managerPinError.set('');
        this.showManagerPin.set(true);
    }

    /**
     * Valida el PIN contra microshopusers y, según la acción pendiente, aplica el
     * descuento de línea o anula la venta. Solo procede si el backend confirma que el
     * PIN pertenece a un supervisor autorizado de esta empresa.
     */
    onManagerPinConfirmed(pin: string): void {
        const anularId = this.pendingAnularVentaId();
        const detail = this.pendingDiscount();
        if (anularId == null && !detail) {
            this.cancelManagerPin();
            return;
        }
        this.managerPinLoading.set(true);
        this.managerPinError.set('');
        this.managerAuth.verificarPinSupervisor(pin, this.companyId).subscribe({
            next: resp => {
                this.managerPinLoading.set(false);
                if (!(resp.authorized && resp.userId != null)) {
                    // PIN inexistente o sin rol autorizador: el diálogo limpia y permite reintento.
                    this.managerPinError.set('PIN no válido o sin permiso de supervisor');
                    return;
                }
                if (anularId != null) {
                    this.ejecutarAnularVenta(anularId, resp.username ?? 'supervisor');
                } else if (detail) {
                    this.carrito.setLineDiscount(detail.varianteId, detail.tipo, detail.valor, resp.userId);
                    this.showToast(`Descuento autorizado por ${resp.username ?? 'supervisor'}`, 'success');
                }
                this.cancelManagerPin();
            },
            error: () => {
                this.managerPinLoading.set(false);
                this.managerPinError.set('No se pudo validar el PIN. Reintenta.');
            },
        });
    }

    /** Llama al backend para anular la venta y refresca historial + recibo mostrado. */
    private ejecutarAnularVenta(ventaId: number, supervisor: string): void {
        this.ventaService.anularVenta(ventaId).subscribe({
            next: venta => {
                this.showToast(`Venta ${venta.numeroTicket} anulada por ${supervisor}`, 'success');
                if (this.lastVenta()?.id === venta.id) this.lastVenta.set(venta);
                this.loadHistorial();
            },
            error: err => this.showToast(this.mensajeError(err, 'No se pudo anular la venta'), 'error'),
        });
    }

    cancelManagerPin(): void {
        this.showManagerPin.set(false);
        this.pendingDiscount.set(null);
        this.pendingAnularVentaId.set(null);
        this.managerPinError.set('');
        this.managerPinLoading.set(false);
    }

    /** Impresión real del recibo en pantalla (la hoja @media print da el formato 80mm). */
    imprimirReciboActual(): void {
        window.print();
    }

    /** Reimprime una venta del historial: muestra el recibo y lanza la impresión. */
    reimprimirVenta(venta: VentaPosResponse): void {
        this.lastVenta.set(venta);
        this.showScreen('recibo');
        // Esperar a que el recibo se renderice antes de invocar la impresión del navegador.
        setTimeout(() => window.print(), 200);
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
                const montoAplicar = Math.min(card.saldoActual, this.carrito.totalAntesDeGiftCard());
                this.carrito.setGiftCard(codigo, montoAplicar);
                this.showToast(`Gift card aplicada: -S/${montoAplicar.toFixed(2)}`, 'success');
            },
            error: () => this.showToast('Gift card no encontrada', 'error'),
        });
    }

    // ── Customer Lookup ──────────────────────────────────────────
    onClientSelected(client: { id: number | null; nombre: string; tipoDoc: string; numDoc: string }): void {
        const tipoDoc = tipoDocSunat(client.tipoDoc);
        // Sin tipo de documento reconocido no hay número que declarar: viaja '0' sin número.
        this.carrito.setCliente(client.id, client.nombre || client.numDoc, tipoDoc, tipoDoc === '0' ? '' : client.numDoc);
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

    /** Filtros avanzados (categoría/marca/unidad/disponibilidad) emitidos por pos-catalog: recarga server-side. */
    onCatalogoFiltersChanged(filtros: PosCatalogFiltro): void {
        this.catalogoFiltros = {
            categoriaId: filtros.categoriaId,
            marca: filtros.marca,
            unidadMedida: filtros.unidadMedida,
            disponibilidad: filtros.disponibilidad,
        };
        this.loadCatalogo();
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
        // Guard anti doble-venta (reentrada): cubre doble-click y el atajo F5,
        // que disparan procesarVenta() sin pasar por el [disabled] del botón.
        if (this.isLoading()) return;
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

        // FACTURA exige cliente con RUC: avisar aquí en vez de esperar el 400 del backend.
        const errorFactura = errorFacturaSinRuc(
            this.carrito.tipoCpe(), this.carrito.clienteTipoDoc(), this.carrito.clienteNumeroDoc());
        if (errorFactura) {
            this.showToast(errorFactura, 'error');
            return;
        }

        // En pago dividido: validar que los montos cubran el RESTO (total menos gift card)
        if (this.carrito.pagoDividido() && this.carrito.faltaPorCubrir() > 0.01) {
            this.showToast(`Faltan S/${this.carrito.faltaPorCubrir().toFixed(2)} por cubrir`, 'error');
            return;
        }

        const request = construirVentaPosRequest({
            turnoCajaId: turno.id,
            items: this.carrito.items(),
            pagoDividido: this.carrito.pagoDividido(),
            pagos: this.carrito.pagos(),
            giftCardCodigo: this.carrito.giftCardCodigo(),
            metodoPagoPrimario: this.carrito.metodoPagoPrimario(),
            tipoCpe: this.carrito.tipoCpe(),
            clienteId: this.carrito.clienteId(),
            clienteNombre: this.carrito.clienteNombre(),
            clienteTipoDoc: this.carrito.clienteTipoDoc(),
            clienteNumeroDoc: this.carrito.clienteNumeroDoc(),
            giftCardCubreTodo: this.carrito.giftCardCubreTodo(),
            descuento: this.carrito.descuento(),
            montoRecibido: this.carrito.montoRecibido(),
        });

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
        // Idempotency-Key por venta: el backend deduplica si la request se reenvía.
        this.ventaService.procesarVenta(request, crypto.randomUUID()).subscribe({
            next: venta => {
                this.lastVenta.set(venta);
                this.carrito.vaciarCarrito();
                this.isLoading.set(false);
                this.showScreen('recibo');
                this.showToast(`Venta registrada — ${venta.numeroCpe ?? venta.numeroTicket}`, 'success');
            },
            error: err => {
                this.isLoading.set(false);
                this.showToast(this.mensajeError(err, 'Error al procesar la venta'), 'error');
            },
        });
    }

    // ── Turno ─────────────────────────────────────────────────────
    abrirTurno(montoApertura: number): void {
        this.turnoService
            .abrirTurno({ cajeroId: this.cajeroId, companyId: this.companyId, montoApertura })
            .subscribe({
                next: turno => {
                    this.turnoActivo.set(turno);
                    this.showToast('Turno abierto correctamente', 'success');
                    // Volver a la pantalla principal tras abrir turno
                    this.showScreen('main');
                },
                error: err => this.showToast(this.mensajeError(err, 'Error al abrir turno'), 'error'),
            });
    }

    cerrarTurno(): void {
        const turno = this.turnoActivo();
        if (!turno) return;
        void this.cierreBloqueadoPorOffline(turno.id).then(bloqueado => {
            if (bloqueado) return;
            this.turnoService.cerrarTurno(turno.id).subscribe({
                next: t => {
                    this.turnoActivo.set(t.estado === 'ABIERTO' ? t : null);
                    this.showToast('Turno cerrado', 'info');
                    if (t.estado !== 'ABIERTO') this.mostrarReporteZ(turno.id);
                },
                error: err => this.showToast(this.mensajeError(err, 'Error al cerrar turno'), 'error'),
            });
        });
    }

    /**
     * El POS no está bajo main-layout, así que el toast del interceptor no se ve aquí: este es el único
     * mensaje que lee el cajero. Con `err.message` veía «Http failure response… 409 Conflict» en vez
     * del motivo que manda el backend.
     */
    private mensajeError(err: unknown, porDefecto: string): string {
        if (err instanceof HttpErrorResponse) return mensajeDeErrorHttp(err);
        return (err as Error | undefined)?.message ?? porDefecto;
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
