import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { VentaPosRequest, VentaPosResponse } from '../models/venta-pos.model';

/**
 * Venta almacenada offline pendiente de sincronización.
 */
export interface OfflineVenta {
    /** UUID v4 generado en el cliente — clave de idempotencia */
    idempotencyKey: string;
    companyId: number;
    turnoCajaId: number;
    request: VentaPosRequest;
    /** Ticket temporal formato OFF-XXXXXX */
    numeroTicketTemp: string;
    /** RECHAZADA: el servidor respondió y no la acepta (regla de negocio); reintentarla no cambia nada. */
    estado: 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADA' | 'ERROR' | 'RECHAZADA';
    intentos: number;
    ultimoError?: string;
    /** ID de la venta real una vez sincronizada */
    ventaPosId?: number;
    /** Respuesta completa del servidor tras sincronizar */
    ventaResponse?: VentaPosResponse;
    fechaCreacionOffline: Date;
    fechaSync?: Date;
}

class PosOfflineDatabase extends Dexie {
    offlineVentas!: Table<OfflineVenta, string>;

    constructor() {
        super('MicroShopPOS');
        this.version(1).stores({
            offlineVentas: 'idempotencyKey, companyId, turnoCajaId, estado, fechaCreacionOffline',
        });
    }
}

@Injectable({ providedIn: 'root' })
export class PosOfflineDbService {
    private readonly db = new PosOfflineDatabase();

    async addVenta(venta: OfflineVenta): Promise<void> {
        await this.db.offlineVentas.put(venta);
    }

    /**
     * Ventas por sincronizar DE ESA EMPRESA (la base Dexie es del navegador, no de la empresa: sin este
     * filtro una venta de la empresa 1 se enviaría con el JWT de la 2 y quedaría en ERROR para siempre).
     * PROCESANDO cuenta: si se cerró la pestaña a mitad de sync la fila queda así y nada la reintentaba;
     * el backend deduplica por idempotencyKey, así que reenviarla es seguro.
     * `turnoCajaId` opcional: sólo las de ese turno.
     */
    async getPendientes(companyId: number, turnoCajaId?: number): Promise<OfflineVenta[]> {
        const ventas = await this.db.offlineVentas
            .where('estado')
            .anyOf('PENDIENTE', 'PROCESANDO', 'ERROR')
            .filter(v => v.companyId === companyId && (turnoCajaId === undefined || v.turnoCajaId === turnoCajaId))
            .toArray();
        return ventas.sort((a, b) => +a.fechaCreacionOffline - +b.fechaCreacionOffline);
    }

    async getAll(companyId: number): Promise<OfflineVenta[]> {
        return this.db.offlineVentas
            .orderBy('fechaCreacionOffline').reverse()
            .filter(v => v.companyId === companyId)
            .toArray();
    }

    async getByKey(idempotencyKey: string): Promise<OfflineVenta | undefined> {
        return this.db.offlineVentas.get(idempotencyKey);
    }

    async updateEstado(
        idempotencyKey: string,
        estado: OfflineVenta['estado'],
        extra?: Partial<OfflineVenta>,
    ): Promise<void> {
        await this.db.offlineVentas.update(idempotencyKey, { estado, ...extra });
    }

    async markSynced(
        idempotencyKey: string,
        ventaPosId: number,
        ventaResponse: VentaPosResponse,
    ): Promise<void> {
        await this.db.offlineVentas.update(idempotencyKey, {
            estado: 'COMPLETADA',
            ventaPosId,
            ventaResponse,
            fechaSync: new Date(),
        });
    }

    async markError(idempotencyKey: string, error: string, intentos: number,
                    estado: 'ERROR' | 'RECHAZADA' = 'ERROR'): Promise<void> {
        await this.db.offlineVentas.update(idempotencyKey, {
            estado,
            ultimoError: error,
            intentos,
        });
    }

    /** Rechazadas por el servidor: ya no bloquean el cierre, pero el cajero tiene que verlas (cobró ese dinero). */
    async getRechazadas(companyId: number): Promise<OfflineVenta[]> {
        return this.db.offlineVentas.where('estado').equals('RECHAZADA')
            .filter(v => v.companyId === companyId).toArray();
    }

    async eliminar(idempotencyKey: string): Promise<void> {
        await this.db.offlineVentas.delete(idempotencyKey);
    }

    async countPendientes(companyId: number, turnoCajaId?: number): Promise<number> {
        return (await this.getPendientes(companyId, turnoCajaId)).length;
    }

    async deleteCompletadas(companyId: number): Promise<void> {
        await this.db.offlineVentas
            .where('estado').equals('COMPLETADA')
            .filter(v => v.companyId === companyId)
            .delete();
    }

    /** Genera un ticket temporal: OFF-XXXXXX */
    generateTempTicket(): string {
        const seq = Math.floor(Math.random() * 999999);
        return `OFF-${seq.toString().padStart(6, '0')}`;
    }

    /** Genera un UUID v4 */
    generateIdempotencyKey(): string {
        return crypto.randomUUID();
    }
}
