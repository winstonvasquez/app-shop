import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { PosOfflineDbService, OfflineVenta } from './pos-offline-db.service';
import { VentaPosRequest, VentaPosResponse } from '../models/venta-pos.model';
import { AuthService } from '@core/auth/auth.service';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';

interface SyncResult {
    idempotencyKey: string;
    estado: string;
    ventaPosId?: number;
    numeroTicket?: string;
    error?: string;
}

@Injectable({ providedIn: 'root' })
export class PosOfflineSyncService {
    private readonly http = inject(HttpClient);
    private readonly offlineDb = inject(PosOfflineDbService);
    private readonly auth = inject(AuthService);
    private readonly baseUrl = environment.apiUrls.pos;

    /** True cuando el navegador está offline */
    readonly isOffline = signal(!navigator.onLine);

    /** Número de ventas pendientes de sincronizar */
    readonly pendingCount = signal(0);

    /** True cuando la sincronización está en progreso */
    readonly syncing = signal(false);

    /** Último resultado de sincronización */
    readonly lastSyncResult = signal<string>('');

    /** Ventas offline que el servidor rechazó: se muestran hasta que el cajero las descarte. */
    readonly rechazadas = signal<OfflineVenta[]>([]);

    readonly hasPending = computed(() => this.pendingCount() > 0);

    constructor() {
        // Detectar cambios online/offline
        window.addEventListener('online', () => {
            this.isOffline.set(false);
            this.syncAll();
        });
        window.addEventListener('offline', () => {
            this.isOffline.set(true);
        });

        // Cargar conteo inicial
        this.refreshPendingCount();
    }

    /**
     * Guarda una venta en la cola offline (IndexedDB).
     * Retorna un ticket temporal para mostrar al cajero.
     */
    async saveOfflineVenta(
        request: VentaPosRequest,
        companyId: number,
    ): Promise<OfflineVenta> {
        const offlineVenta: OfflineVenta = {
            idempotencyKey: this.offlineDb.generateIdempotencyKey(),
            companyId,
            turnoCajaId: request.turnoCajaId,
            request,
            numeroTicketTemp: this.offlineDb.generateTempTicket(),
            estado: 'PENDIENTE',
            intentos: 0,
            fechaCreacionOffline: new Date(),
        };

        await this.offlineDb.addVenta(offlineVenta);
        await this.refreshPendingCount();
        return offlineVenta;
    }

    /** Empresa activa: la cola offline se lista y sincroniza SÓLO para ella. Sin usuario no hay cola. */
    private get companyId(): number | null {
        return this.auth.currentUser()?.activeCompanyId ?? null;
    }

    /** Ventas offline sin sincronizar de la empresa activa que pertenecen a ese turno. */
    async pendientesDeTurno(turnoCajaId: number): Promise<number> {
        const companyId = this.companyId;
        return companyId === null ? 0 : this.offlineDb.countPendientes(companyId, turnoCajaId);
    }

    /**
     * Sincroniza todas las ventas pendientes con el backend.
     */
    async syncAll(): Promise<void> {
        if (this.isOffline() || this.syncing()) return;
        const companyId = this.companyId;
        if (companyId === null) return;

        const pendientes = await this.offlineDb.getPendientes(companyId);
        this.pendingCount.set(pendientes.length);
        if (pendientes.length === 0) {
            await this.refreshPendingCount(); // también las rechazadas (p. ej. tras cambiar de empresa)
            return;
        }

        this.syncing.set(true);
        let ok = 0;
        let errors = 0;

        for (const venta of pendientes) {
            try {
                await this.offlineDb.updateEstado(venta.idempotencyKey, 'PROCESANDO');

                const result = await firstValueFrom(
                    this.http.post<SyncResult>(`${this.baseUrl}/offline/sync`, {
                        idempotencyKey: venta.idempotencyKey,
                        companyId: venta.companyId,
                        turnoCajaId: venta.turnoCajaId,
                        payloadJson: JSON.stringify(venta.request),
                        numeroTicketTemp: venta.numeroTicketTemp,
                        fechaCreacionOffline: venta.fechaCreacionOffline.toISOString(),
                    }),
                );

                if (result.estado === 'COMPLETADA' && result.ventaPosId) {
                    // Fetch la venta real para tener el recibo completo
                    const ventaReal = await firstValueFrom(
                        this.http.get<VentaPosResponse>(
                            `${this.baseUrl}/ventas/${result.ventaPosId}/recibo`,
                        ),
                    );
                    await this.offlineDb.markSynced(
                        venta.idempotencyKey,
                        result.ventaPosId,
                        ventaReal,
                    );
                    ok++;
                } else {
                    // RECHAZADA = regla de negocio (stock, turno cerrado, descuento…): reintentarla daría lo
                    // mismo y, contada como pendiente, bloqueaba el cierre del turno para siempre. ERROR =
                    // fallo pasajero del servidor: se reintenta.
                    await this.offlineDb.markError(
                        venta.idempotencyKey,
                        result.error ?? 'Rechazada por el servidor',
                        venta.intentos + 1,
                        result.estado === 'RECHAZADA' ? 'RECHAZADA' : 'ERROR',
                    );
                    errors++;
                }
            } catch (err) {
                const message = err instanceof HttpErrorResponse ? mensajeDeErrorHttp(err)
                    : err instanceof Error ? err.message : 'Error de red';
                await this.offlineDb.markError(
                    venta.idempotencyKey,
                    message,
                    venta.intentos + 1,
                );
                errors++;
            }
        }

        this.syncing.set(false);
        this.lastSyncResult.set(`${ok} sincronizadas, ${errors} con error`);
        await this.refreshPendingCount();
    }

    /** Obtener todas las ventas offline (historial local) */
    async getOfflineVentas(): Promise<OfflineVenta[]> {
        const companyId = this.companyId;
        return companyId === null ? [] : this.offlineDb.getAll(companyId);
    }

    /** Limpiar ventas ya sincronizadas del IndexedDB */
    async clearCompleted(): Promise<void> {
        const companyId = this.companyId;
        if (companyId !== null) await this.offlineDb.deleteCompletadas(companyId);
        await this.refreshPendingCount();
    }

    async refreshPendingCount(): Promise<void> {
        const companyId = this.companyId;
        this.pendingCount.set(companyId === null ? 0 : await this.offlineDb.countPendientes(companyId));
        this.rechazadas.set(companyId === null ? [] : await this.offlineDb.getRechazadas(companyId));
    }

    /** El cajero ya la registró de nuevo o la anotó para el arqueo. */
    async descartarRechazada(idempotencyKey: string): Promise<void> {
        await this.offlineDb.eliminar(idempotencyKey);
        await this.refreshPendingCount();
    }
}
