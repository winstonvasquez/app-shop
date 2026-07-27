import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PageResponse } from '@core/models/pagination.model';
import {
    WarehouseZone, CreateZoneRequest,
    ZoneLocation, CreateZoneLocationRequest,
    Lot, CreateLotRequest, LotExpirationAlert,
    SerialNumberWms, CreateSerialRequest, SerialStatusWms,
    ReplenishmentRule, CreateReplenishmentRuleRequest,
    KardexLogisticoEntry, LotSelectionStrategy
} from '../models/wms-zone.models';

/**
 * API del dominio WMS "logística" (Almacén = UUID, `com.microshop.logistica`):
 * zonas/ubicaciones jerárquicas, lotes/series, reglas de reposición automática,
 * kardex por almacén. Backend en `${environment.apiUrls.logistics}/api` —
 * distinto de `InventoryApiService` (dominio "invalmacen", Warehouse = Long).
 */
@Injectable({ providedIn: 'root' })
export class WmsApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api`;

    private buildParams(params: Record<string, string | number | boolean | null | undefined>): HttpParams {
        let httpParams = new HttpParams();
        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined && value !== '') {
                httpParams = httpParams.set(key, String(value));
            }
        }
        return httpParams;
    }

    // ── Zonas ──────────────────────────────────────────────────────────
    /**
     * Listado paginado de zonas con filtros avanzados server-side (almacén, tipo,
     * temperatura, búsqueda de texto y rango de fecha de creación). TODOS opcionales
     * salvo `almacenId` que en la práctica siempre se manda desde el toolbar de
     * `ZoneManagementComponent` (ver `WarehouseZoneController.listar`).
     */
    getZones(params: {
        almacenId?: string;
        tipo?: string;
        temperatura?: string;
        q?: string;
        fechaCreacionDesde?: string;
        fechaCreacionHasta?: string;
        page?: number;
        size?: number;
    } = {}): Observable<PageResponse<WarehouseZone>> {
        return this.http.get<PageResponse<WarehouseZone>>(`${this.baseUrl}/zonas`, {
            params: this.buildParams({ page: 0, size: 20, ...params })
        });
    }

    createZone(payload: CreateZoneRequest): Observable<WarehouseZone> {
        return this.http.post<WarehouseZone>(`${this.baseUrl}/zonas`, payload);
    }

    updateZone(id: string, payload: CreateZoneRequest): Observable<WarehouseZone> {
        return this.http.put<WarehouseZone>(`${this.baseUrl}/zonas/${id}`, payload);
    }

    deleteZone(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/zonas/${id}`);
    }

    getZone(id: string): Observable<WarehouseZone> {
        return this.http.get<WarehouseZone>(`${this.baseUrl}/zonas/${id}`);
    }

    // ── Ubicaciones (dentro de una zona) ────────────────────────────────
    getZoneLocations(zoneId?: string, page = 0, size = 20): Observable<PageResponse<ZoneLocation>> {
        return this.http.get<PageResponse<ZoneLocation>>(`${this.baseUrl}/ubicaciones`, {
            params: this.buildParams({ zoneId, page, size })
        });
    }

    createZoneLocation(payload: CreateZoneLocationRequest): Observable<ZoneLocation> {
        return this.http.post<ZoneLocation>(`${this.baseUrl}/ubicaciones`, payload);
    }

    updateZoneLocation(id: string, payload: CreateZoneLocationRequest): Observable<ZoneLocation> {
        return this.http.put<ZoneLocation>(`${this.baseUrl}/ubicaciones/${id}`, payload);
    }

    deleteZoneLocation(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/ubicaciones/${id}`);
    }

    // ── Lotes ────────────────────────────────────────────────────────
    getLotsByProducto(productoId: string, fefo = false): Observable<Lot[]> {
        return this.http.get<Lot[]>(`${this.baseUrl}/lotes`, {
            params: this.buildParams({ productoId, fefo })
        });
    }

    /**
     * Listado GLOBAL paginado de lotes con filtros avanzados server-side (producto,
     * activo, proveedor, estado de vencimiento DERIVADO —códigos exactos VIGENTE |
     * POR_VENCER | VENCIDO—, rangos de fecha de vencimiento/fabricación y búsqueda de
     * texto). Reemplaza el flujo previo que exigía elegir un producto antes de listar.
     * Ver GET /logistics/api/lotes/paged.
     */
    getLotsPaged(params: {
        productoId?: string;
        activo?: boolean;
        proveedorNombre?: string;
        estadoVencimiento?: string;
        vencimientoDesde?: string;
        vencimientoHasta?: string;
        fabricacionDesde?: string;
        fabricacionHasta?: string;
        q?: string;
        page?: number;
        size?: number;
    } = {}): Observable<PageResponse<Lot>> {
        return this.http.get<PageResponse<Lot>>(`${this.baseUrl}/lotes/paged`, {
            params: this.buildParams({ ...params })
        });
    }

    createLot(payload: CreateLotRequest): Observable<Lot> {
        return this.http.post<Lot>(`${this.baseUrl}/lotes`, payload);
    }

    updateLot(id: string, payload: CreateLotRequest): Observable<Lot> {
        return this.http.put<Lot>(`${this.baseUrl}/lotes/${id}`, payload);
    }

    deleteLot(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/lotes/${id}`);
    }

    getLotsExpiringSoon(dias = 30): Observable<LotExpirationAlert[]> {
        return this.http.get<LotExpirationAlert[]>(`${this.baseUrl}/lotes/vencimiento-proximo`, {
            params: this.buildParams({ dias })
        });
    }

    consumirLote(productoId: string, cantidad: number, strategy: LotSelectionStrategy): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/lotes/consumir`, { productoId, cantidad, strategy });
    }

    // ── Números de serie ─────────────────────────────────────────────
    registrarSerial(payload: CreateSerialRequest): Observable<SerialNumberWms> {
        return this.http.post<SerialNumberWms>(`${this.baseUrl}/numeros-serie`, payload);
    }

    cambiarStatusSerial(id: string, status: SerialStatusWms): Observable<SerialNumberWms> {
        return this.http.patch<SerialNumberWms>(`${this.baseUrl}/numeros-serie/${id}/status`, null, {
            params: this.buildParams({ status })
        });
    }

    buscarSerial(serial: string): Observable<SerialNumberWms> {
        return this.http.get<SerialNumberWms>(`${this.baseUrl}/numeros-serie/buscar`, {
            params: this.buildParams({ serial })
        });
    }

    /**
     * Listado paginado de números de serie con filtros avanzados server-side (producto,
     * estado, lote, ubicación actual, búsqueda de texto y rango de fecha de alta).
     * IMPORTANTE: el backend cambió de `List<SerialNumberResponse>` a `Page<SerialNumberResponse>`
     * (ver `SerialNumberController.listar`) — no volver a tratar la respuesta como array.
     */
    listarSeriales(params: {
        productoId?: string;
        status?: SerialStatusWms;
        lotId?: string;
        currentLocation?: string;
        q?: string;
        fechaCreacionDesde?: string;
        fechaCreacionHasta?: string;
        page?: number;
        size?: number;
    } = {}): Observable<PageResponse<SerialNumberWms>> {
        return this.http.get<PageResponse<SerialNumberWms>>(`${this.baseUrl}/numeros-serie`, {
            params: this.buildParams({ ...params })
        });
    }

    // ── Reglas de reposición automática ─────────────────────────────
    /**
     * Filtros server-side de reglas de reposición — TODOS opcionales, TODO el
     * filtrado ocurre en el backend (ver `ReplenishmentRuleController.listar`).
     * `q` busca sobre SKU / nombre de producto / proveedor preferido.
     */
    getReplenishmentRules(params?: {
        page?: number;
        size?: number;
        q?: string;
        status?: string;
        almacenId?: string;
        autoCreatePo?: boolean;
        lastTriggeredAtDesde?: string;
        lastTriggeredAtHasta?: string;
        lastPoCreatedAtDesde?: string;
        lastPoCreatedAtHasta?: string;
    }): Observable<PageResponse<ReplenishmentRule>> {
        return this.http.get<PageResponse<ReplenishmentRule>>(`${this.baseUrl}/reglas-reposicion`, {
            params: this.buildParams({
                page: params?.page ?? 0,
                size: params?.size ?? 20,
                q: params?.q,
                status: params?.status,
                almacenId: params?.almacenId,
                autoCreatePo: params?.autoCreatePo,
                lastTriggeredAtDesde: params?.lastTriggeredAtDesde,
                lastTriggeredAtHasta: params?.lastTriggeredAtHasta,
                lastPoCreatedAtDesde: params?.lastPoCreatedAtDesde,
                lastPoCreatedAtHasta: params?.lastPoCreatedAtHasta
            })
        });
    }

    createReplenishmentRule(payload: CreateReplenishmentRuleRequest): Observable<ReplenishmentRule> {
        return this.http.post<ReplenishmentRule>(`${this.baseUrl}/reglas-reposicion`, payload);
    }

    updateReplenishmentRule(id: string, payload: CreateReplenishmentRuleRequest): Observable<ReplenishmentRule> {
        return this.http.put<ReplenishmentRule>(`${this.baseUrl}/reglas-reposicion/${id}`, payload);
    }

    cambiarStatusReplenishmentRule(id: string, status: string): Observable<ReplenishmentRule> {
        return this.http.patch<ReplenishmentRule>(`${this.baseUrl}/reglas-reposicion/${id}/status`, null, {
            params: this.buildParams({ status })
        });
    }

    deleteReplenishmentRule(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/reglas-reposicion/${id}`);
    }

    /** Dispara manualmente la creación de una OC real en microshopcompras a partir de la regla. */
    createPoFromRule(id: string): Observable<{ purchaseOrderId: string }> {
        return this.http.post<{ purchaseOrderId: string }>(`${this.baseUrl}/reglas-reposicion/${id}/create-po`, {});
    }

    // ── Kardex por almacén ───────────────────────────────────────────
    /**
     * Kardex paginado de un almacén, con filtros avanzados server-side. `from`/`to` son
     * OPCIONALES (antes exigidos): sin ellos trae todo el histórico. `tipoMovimiento` y
     * `productoId` filtran, `q` busca sobre sku/nombre de producto/descripción.
     * Ver GET /logistics/api/kardex/almacen/{almacenId}.
     */
    getKardexPorAlmacen(almacenId: string, filtros: {
        from?: string;
        to?: string;
        tipoMovimiento?: string;
        productoId?: string;
        q?: string;
        page?: number;
        size?: number;
    } = {}): Observable<PageResponse<KardexLogisticoEntry>> {
        return this.http.get<PageResponse<KardexLogisticoEntry>>(`${this.baseUrl}/kardex/almacen/${almacenId}`, {
            params: this.buildParams({
                from: filtros.from,
                to: filtros.to,
                tipoMovimiento: filtros.tipoMovimiento,
                productoId: filtros.productoId,
                q: filtros.q,
                page: filtros.page ?? 0,
                size: filtros.size ?? 20
            })
        });
    }
}
