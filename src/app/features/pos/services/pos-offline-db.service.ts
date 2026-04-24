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
    estado: 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADA' | 'ERROR';
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

    async getPendientes(): Promise<OfflineVenta[]> {
        return this.db.offlineVentas
            .where('estado')
            .anyOf('PENDIENTE', 'ERROR')
            .sortBy('fechaCreacionOffline');
    }

    async getAll(): Promise<OfflineVenta[]> {
        return this.db.offlineVentas.orderBy('fechaCreacionOffline').reverse().toArray();
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

    async markError(idempotencyKey: string, error: string, intentos: number): Promise<void> {
        await this.db.offlineVentas.update(idempotencyKey, {
            estado: 'ERROR',
            ultimoError: error,
            intentos,
        });
    }

    async countPendientes(): Promise<number> {
        return this.db.offlineVentas.where('estado').anyOf('PENDIENTE', 'ERROR').count();
    }

    async deleteCompletadas(): Promise<void> {
        await this.db.offlineVentas.where('estado').equals('COMPLETADA').delete();
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
