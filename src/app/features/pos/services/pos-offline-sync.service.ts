import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { PosOfflineDbService, OfflineVenta } from './pos-offline-db.service';
import { VentaPosRequest, VentaPosResponse } from '../models/venta-pos.model';
import { firstValueFrom } from 'rxjs';

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
    private readonly baseUrl = environment.apiUrls.pos;

    /** True cuando el navegador está offline */
    readonly isOffline = signal(!navigator.onLine);

    /** Número de ventas pendientes de sincronizar */
    readonly pendingCount = signal(0);

    /** True cuando la sincronización está en progreso */
    readonly syncing = signal(false);

    /** Último resultado de sincronización */
    readonly lastSyncResult = signal<string>('');

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

    /**
     * Sincroniza todas las ventas pendientes con el backend.
     */
    async syncAll(): Promise<void> {
        if (this.isOffline() || this.syncing()) return;

        const pendientes = await this.offlineDb.getPendientes();
        if (pendientes.length === 0) return;

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
                    await this.offlineDb.markError(
                        venta.idempotencyKey,
                        result.error ?? 'Error desconocido',
                        venta.intentos + 1,
                    );
                    errors++;
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Error de red';
                await this.offlineDb.markError(
                    venta.idempotencyKey,
                    message,
                    venta.intentos + 1,
                );
                errors++;
            }
        }

        this.syncing.set(false);
        this.lastSyncResult.set(`Sync: ${ok} OK, ${errors} errores`);
        await this.refreshPendingCount();
    }

    /** Obtener todas las ventas offline (historial local) */
    async getOfflineVentas(): Promise<OfflineVenta[]> {
        return this.offlineDb.getAll();
    }

    /** Limpiar ventas ya sincronizadas del IndexedDB */
    async clearCompleted(): Promise<void> {
        await this.offlineDb.deleteCompletadas();
        await this.refreshPendingCount();
    }

    async refreshPendingCount(): Promise<void> {
        const count = await this.offlineDb.countPendientes();
        this.pendingCount.set(count);
    }
}
