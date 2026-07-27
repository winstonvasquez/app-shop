import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
    Warehouse,
    Location,
    InventoryStock,
    InventoryMovement,
    InventoryMovementRequest,
    InventoryTransfer,
    InventoryTransferRequest,
    InventoryCount,
    InventoryCountRequest,
    KardexEntry,
    PageResponse,
    StockThresholdsRequest
} from '../models/inventory.models';

/**
 * KPIs del dashboard de inventario. Refleja el contrato real del backend
 * (DashboardInventarioResponse de microshoplogistica, endpoint /api/dashboard/inventory).
 * Los movimientos recientes NO vienen aquí — se cargan aparte vía getMovements().
 */
export interface DashboardSummary {
    totalAlmacenes: number;
    almacenesActivos: number;
    productosStockBajo: number;
    productosNecesitanReorden: number;
    movimientosHoy: number;
    /** Inventory Record Accuracy (IRA) del último conteo físico cerrado. null si no hay conteos. */
    inventoryAccuracyPct: number | null;
}

/** Clasificación ABC (Pareto) — resumen por clase A/B/C. */
export interface AbcClaseResumen {
    clase: string;
    productos: number;
    valor: number;
    valorPct: number;
    productosPct: number;
}

/** Un producto clasificado en la curva de Pareto del inventario. */
export interface AbcItem {
    productId: number;
    valorConsumo: number;
    unidades: number;
    participacionPct: number;
    acumuladoPct: number;
    clase: string;
}

/**
 * Respuesta del análisis ABC de inventario. `items` viaja paginado desde el backend
 * (la clasificación de Pareto se calcula sobre el período completo, pero el listado
 * de productos se pagina): NO cargar todo y paginar en cliente.
 */
export interface AbcAnalysis {
    periodoDias: number;
    totalProductos: number;
    valorTotal: number;
    resumen: AbcClaseResumen[];
    items: PageResponse<AbcItem>;
}

/** Una ubicación candidata de putaway. */
export interface PutawaySuggestion {
    locationId: number;
    code: string;
    name: string;
    ubicacion: string;
    locationType: string | null;
    capacidad: number | null;
    ocupado: number;
    disponible: number | null;
    razon: string;
}

/** Sugerencias de putaway para guardar un producto en un almacén. */
export interface PutawayResponse {
    warehouseId: number;
    productId: number;
    cantidad: number;
    totalSugerencias: number;
    sugerencias: PutawaySuggestion[];
}

/** Línea de un ASN: esperado vs. recibido. */
export interface AsnLine {
    id: number;
    productId: number;
    sku: string | null;
    productName: string | null;
    expectedQuantity: number;
    receivedQuantity: number;
    unitCost: number | null;
    notes: string | null;
}

/** ASN (Advanced Shipping Notice) — recepción controlada de mercadería. */
export interface Asn {
    id: number;
    asnNumber: string;
    supplierName: string | null;
    referenceDocument: string | null;
    warehouseId: number;
    expectedDate: string | null;
    status: string;            // PENDIENTE | CONFORME | CON_DIFERENCIAS
    receivedDate: string | null;
    receivedBy: string | null;
    notes: string | null;
    createdAt: string;
    lines: AsnLine[];
}

export interface CreateAsnLineRequest {
    productId: number;
    sku?: string;
    productName?: string;
    expectedQuantity: number;
    unitCost?: number;
    notes?: string;
}

export interface CreateAsnRequest {
    supplierName?: string;
    referenceDocument?: string;
    warehouseId: number;
    expectedDate?: string;
    notes?: string;
    lines: CreateAsnLineRequest[];
}

export interface ReceiveAsnLine {
    lineId: number;
    receivedQuantity: number;
    notes?: string;
}

export interface ReceiveAsnRequest {
    lines: ReceiveAsnLine[];
}

/**
 * Filtros server-side del listado paginado de stock (GET /inventory/api/inventory/stock/paged).
 * TODOS opcionales. `estadoStock` es DERIVADO en el backend — valores exactos:
 * BAJO_MINIMO | REORDEN | NORMAL.
 */
export interface StockFiltros {
    page?: number;
    size?: number;
    warehouseId?: number;
    locationId?: number;
    productId?: number;
    estadoStock?: string;
    /** yyyy-MM-dd */
    updatedAtDesde?: string;
    /** yyyy-MM-dd */
    updatedAtHasta?: string;
}

/**
 * Filtros server-side del kardex de un producto (GET /inventory/api/kardex/product/{id}).
 * TODOS opcionales.
 */
export interface KardexFiltros {
    page?: number;
    size?: number;
    warehouseId?: number;
    movementType?: string;
    referenceType?: string;
    /** yyyy-MM-dd */
    movementDateDesde?: string;
    /** yyyy-MM-dd */
    movementDateHasta?: string;
    /** Busca sobre N° movimiento / N° referencia / realizado por. */
    q?: string;
}

@Injectable({
    providedIn: 'root'
})
export class InventoryApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.inventory}/api`;

    private buildParams(params: Record<string, string | number | boolean | null | undefined>): HttpParams {
        let httpParams = new HttpParams();
        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined && value !== '') {
                httpParams = httpParams.set(key, String(value));
            }
        }
        return httpParams;
    }

    getWarehouses(): Observable<Warehouse[]> {
        return this.http.get<Warehouse[]>(`${this.baseUrl}/warehouses`);
    }

    /**
     * Página de warehouses con `search` + filtros avanzados server-side (activo, almacén
     * principal, ciudad, rango de fecha de alta). Pensado para el adapter
     * `ServerSelectDataSource` (ver `warehouseSelectSource`, que solo usa page/size/search)
     * y para el listado de `WarehouseManagementComponent` — no muta ningún estado
     * compartido, solo envuelve la llamada HTTP.
     */
    searchWarehousesPaged(
        page = 0, size = 10, search?: string, active?: boolean,
        isPrincipal?: boolean, city?: string, createdAtDesde?: string, createdAtHasta?: string
    ): Observable<PageResponse<Warehouse>> {
        return this.http.get<PageResponse<Warehouse>>(`${this.baseUrl}/warehouses/paged`, {
            params: this.buildParams({ page, size, search, active, isPrincipal, city, createdAtDesde, createdAtHasta })
        });
    }

    createWarehouse(payload: Partial<Warehouse>): Observable<Warehouse> {
        return this.http.post<Warehouse>(`${this.baseUrl}/warehouses`, payload);
    }

    updateWarehouse(id: number, payload: Partial<Warehouse>): Observable<Warehouse> {
        return this.http.put<Warehouse>(`${this.baseUrl}/warehouses/${id}`, payload);
    }

    deleteWarehouse(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/warehouses/${id}`);
    }

    getLocationsByWarehouse(warehouseId: number): Observable<Location[]> {
        return this.http.get<Location[]>(`${this.baseUrl}/locations/by-warehouse/${warehouseId}`);
    }

    /**
     * Listado paginado de ubicaciones con filtros avanzados server-side (almacén, tipo,
     * estado, búsqueda de texto y rango de fecha de alta). Reemplaza el filtrado/paginación
     * client-side de `LocationManagementComponent` — todos los filtros son opcionales.
     */
    searchLocationsPaged(params: {
        page?: number;
        size?: number;
        warehouseId?: number;
        locationType?: string;
        active?: boolean;
        aisle?: string;
        q?: string;
        createdAtDesde?: string;
        createdAtHasta?: string;
    } = {}): Observable<PageResponse<Location>> {
        return this.http.get<PageResponse<Location>>(`${this.baseUrl}/locations/paged`, {
            params: this.buildParams({ ...params })
        });
    }

    createLocation(payload: Partial<Location>): Observable<Location> {
        return this.http.post<Location>(`${this.baseUrl}/locations`, payload);
    }

    updateLocation(id: number, payload: Partial<Location>): Observable<Location> {
        return this.http.put<Location>(`${this.baseUrl}/locations/${id}`, payload);
    }

    deleteLocation(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/locations/${id}`);
    }

    getStockByWarehouse(warehouseId: number): Observable<InventoryStock[]> {
        return this.http.get<InventoryStock[]>(`${this.baseUrl}/inventory/stock/warehouse/${warehouseId}`);
    }

    /**
     * Listado paginado de stock con filtros avanzados server-side (reemplaza el filtrado
     * client-side de `StockViewComponent`). `estadoStock` es un filtro DERIVADO (comparación
     * quantity vs minimumStock/reorderPoint en el backend) — valores exactos: BAJO_MINIMO,
     * REORDEN, NORMAL. Ver GET /inventory/api/inventory/stock/paged.
     */
    getStockPaged(filtros: StockFiltros = {}): Observable<PageResponse<InventoryStock>> {
        return this.http.get<PageResponse<InventoryStock>>(`${this.baseUrl}/inventory/stock/paged`, {
            params: this.buildParams({
                page: filtros.page ?? 0,
                size: filtros.size ?? 20,
                warehouseId: filtros.warehouseId,
                locationId: filtros.locationId,
                productId: filtros.productId,
                estadoStock: filtros.estadoStock,
                updatedAtDesde: filtros.updatedAtDesde,
                updatedAtHasta: filtros.updatedAtHasta
            })
        });
    }

    getStockByProduct(productId: number): Observable<InventoryStock[]> {
        return this.http.get<InventoryStock[]>(`${this.baseUrl}/inventory/stock/product/${productId}`);
    }

    getLowStock(): Observable<InventoryStock[]> {
        return this.http.get<InventoryStock[]>(`${this.baseUrl}/inventory/stock/below-minimum`);
    }

    /** Define stock mínimo, máximo y punto de reorden — sin esto quedan en 0 y las alertas nunca disparan. */
    setStockThresholds(warehouseId: number, productId: number, payload: StockThresholdsRequest): Observable<InventoryStock> {
        return this.http.put<InventoryStock>(
            `${this.baseUrl}/inventory/stock/${warehouseId}/${productId}/thresholds`, payload);
    }

    createMovement(payload: InventoryMovementRequest): Observable<InventoryMovement> {
        return this.http.post<InventoryMovement>(`${this.baseUrl}/inventory/movements`, payload);
    }

    /**
     * Filtros server-side del listado de movimientos — TODOS opcionales. `q` busca sobre
     * N° movimiento / N° referencia / motivo / realizado por (ver `InventoryMovementController.findAll`).
     */
    getMovements(params?: {
        warehouseId?: number;
        page?: number;
        size?: number;
        movementType?: string;
        referenceType?: string;
        locationId?: number;
        productId?: number;
        movementDateDesde?: string;
        movementDateHasta?: string;
        q?: string;
    }): Observable<PageResponse<InventoryMovement>> {
        const httpParams = this.buildParams({
            page: params?.page,
            size: params?.size,
            movementType: params?.movementType,
            referenceType: params?.referenceType,
            locationId: params?.locationId,
            productId: params?.productId,
            movementDateDesde: params?.movementDateDesde,
            movementDateHasta: params?.movementDateHasta,
            q: params?.q
        });

        if (params?.warehouseId !== undefined) {
            return this.http.get<PageResponse<InventoryMovement>>(`${this.baseUrl}/inventory/movements/warehouse/${params.warehouseId}`, {
                params: httpParams
            });
        }

        return this.http.get<PageResponse<InventoryMovement>>(`${this.baseUrl}/inventory/movements`, { params: httpParams });
    }

    createTransfer(payload: InventoryTransferRequest): Observable<InventoryTransfer> {
        return this.http.post<InventoryTransfer>(`${this.baseUrl}/transfers`, payload);
    }

    sendTransfer(id: number): Observable<InventoryTransfer> {
        return this.http.post<InventoryTransfer>(`${this.baseUrl}/transfers/${id}/send`, {});
    }

    receiveTransfer(id: number): Observable<InventoryTransfer> {
        return this.http.post<InventoryTransfer>(`${this.baseUrl}/transfers/${id}/receive`, {});
    }

    cancelTransfer(id: number, motivo?: string): Observable<InventoryTransfer> {
        return this.http.post<InventoryTransfer>(`${this.baseUrl}/transfers/${id}/cancel`, { motivo: motivo || undefined });
    }

    /**
     * Filtros server-side de transferencias — TODOS opcionales, TODO el filtrado
     * ocurre en el backend (ver `TransferController.findAll`). La vista nunca
     * filtra la página cargada.
     */
    getTransfers(params?: {
        page?: number;
        size?: number;
        q?: string;
        status?: string;
        sourceWarehouseId?: number;
        destinationWarehouseId?: number;
        requestDateDesde?: string;
        requestDateHasta?: string;
        sentDateDesde?: string;
        sentDateHasta?: string;
        receivedDateDesde?: string;
        receivedDateHasta?: string;
    }): Observable<PageResponse<InventoryTransfer>> {
        const httpParams = this.buildParams({
            page: params?.page,
            size: params?.size,
            q: params?.q,
            status: params?.status,
            sourceWarehouseId: params?.sourceWarehouseId,
            destinationWarehouseId: params?.destinationWarehouseId,
            requestDateDesde: params?.requestDateDesde,
            requestDateHasta: params?.requestDateHasta,
            sentDateDesde: params?.sentDateDesde,
            sentDateHasta: params?.sentDateHasta,
            receivedDateDesde: params?.receivedDateDesde,
            receivedDateHasta: params?.receivedDateHasta
        });
        return this.http.get<PageResponse<InventoryTransfer>>(`${this.baseUrl}/transfers`, { params: httpParams });
    }

    getPendingTransfers(): Observable<InventoryTransfer[]> {
        return this.http.get<InventoryTransfer[]>(`${this.baseUrl}/transfers/pending`);
    }

    createInventoryCount(payload: InventoryCountRequest): Observable<InventoryCount> {
        return this.http.post<InventoryCount>(`${this.baseUrl}/inventory/counts`, payload);
    }

    /**
     * Filtros server-side de conteos físicos — TODOS opcionales, TODO el filtrado
     * ocurre en el backend (ver `InventoryCountController.list`).
     */
    getInventoryCounts(params?: {
        page?: number;
        size?: number;
        q?: string;
        status?: string;
        warehouseId?: number;
        countDateDesde?: string;
        countDateHasta?: string;
        adjustedDateDesde?: string;
        adjustedDateHasta?: string;
    }): Observable<PageResponse<InventoryCount>> {
        const httpParams = this.buildParams({
            page: params?.page,
            size: params?.size,
            q: params?.q,
            status: params?.status,
            warehouseId: params?.warehouseId,
            countDateDesde: params?.countDateDesde,
            countDateHasta: params?.countDateHasta,
            adjustedDateDesde: params?.adjustedDateDesde,
            adjustedDateHasta: params?.adjustedDateHasta
        });
        return this.http.get<PageResponse<InventoryCount>>(`${this.baseUrl}/inventory/counts`, { params: httpParams });
    }

    /**
     * Aplica los ajustes de un conteo físico CERRADO: genera los movimientos
     * ENTRADA_AJUSTE / SALIDA_AJUSTE al kardex y deja el conteo en AJUSTADO.
     * Idempotente en backend (re-invocar sobre uno ya AJUSTADO no duplica).
     */
    /** Cierra un conteo EN_PROCESO (congela como paso previo al ajuste). Idempotente en backend. */
    closeInventoryCount(id: number): Observable<InventoryCount> {
        return this.http.post<InventoryCount>(`${this.baseUrl}/inventory/counts/${id}/close`, {});
    }

    applyCountAdjustments(id: number): Observable<InventoryCount> {
        return this.http.post<InventoryCount>(`${this.baseUrl}/inventory/counts/${id}/apply-adjustments`, {});
    }

    /**
     * Kardex paginado de un producto con filtros avanzados server-side (reemplaza el
     * fetch-todo-y-slice-en-cliente de `KardexViewComponent`). TODOS los filtros opcionales.
     * `q` busca sobre N° movimiento / N° referencia / realizado por. Ver GET /inventory/api/kardex/product/{id}.
     */
    getKardexByProduct(productId: number, filtros: KardexFiltros = {}): Observable<PageResponse<KardexEntry>> {
        return this.http.get<PageResponse<KardexEntry>>(`${this.baseUrl}/kardex/product/${productId}`, {
            params: this.buildParams({
                page: filtros.page ?? 0,
                size: filtros.size ?? 20,
                warehouseId: filtros.warehouseId,
                movementType: filtros.movementType,
                referenceType: filtros.referenceType,
                movementDateDesde: filtros.movementDateDesde,
                movementDateHasta: filtros.movementDateHasta,
                q: filtros.q
            })
        });
    }

    getDashboardSummary(): Observable<DashboardSummary> {
        return this.http.get<DashboardSummary>(`${this.baseUrl}/dashboard/inventory`);
    }

    /**
     * Análisis ABC del inventario (Pareto por valor de consumo en los últimos `dias`,
     * o en el rango explícito `movementDateDesde/Hasta` si se manda). `items` viaja
     * paginado — pasar `page`/`size` en vez de paginar en cliente.
     */
    getAbcAnalysis(params?: {
        dias?: number;
        warehouseId?: number;
        clase?: string;
        movementDateDesde?: string;
        movementDateHasta?: string;
        page?: number;
        size?: number;
    }): Observable<AbcAnalysis> {
        return this.http.get<AbcAnalysis>(`${this.baseUrl}/inventory/abc-analysis`, {
            params: this.buildParams({
                dias: params?.dias ?? 365,
                warehouseId: params?.warehouseId,
                clase: params?.clase,
                movementDateDesde: params?.movementDateDesde,
                movementDateHasta: params?.movementDateHasta,
                page: params?.page ?? 0,
                size: params?.size ?? 15
            })
        });
    }

    /** Sugerencias de putaway (ubicación de almacenamiento) para una recepción. */
    getPutawaySuggestions(warehouseId: number, productId: number, quantity?: number): Observable<PutawayResponse> {
        return this.http.get<PutawayResponse>(`${this.baseUrl}/inventory/putaway/suggest`, {
            params: this.buildParams({ warehouseId, productId, quantity })
        });
    }

    // ── ASN (recepción controlada) ────────────────────────────────────
    /**
     * Filtros server-side de ASN — TODOS opcionales, TODO el filtrado ocurre en el
     * backend (ver `AsnController.list`). La vista nunca filtra la página cargada.
     */
    getAsnList(params?: {
        status?: string;
        warehouseId?: number;
        supplierName?: string;
        expectedDesde?: string;
        expectedHasta?: string;
        receivedDesde?: string;
        receivedHasta?: string;
        createdDesde?: string;
        createdHasta?: string;
        q?: string;
        page?: number;
        size?: number;
    }): Observable<PageResponse<Asn>> {
        return this.http.get<PageResponse<Asn>>(`${this.baseUrl}/inventory/asn`, {
            params: this.buildParams({
                status: params?.status,
                warehouseId: params?.warehouseId,
                supplierName: params?.supplierName,
                expectedDesde: params?.expectedDesde,
                expectedHasta: params?.expectedHasta,
                receivedDesde: params?.receivedDesde,
                receivedHasta: params?.receivedHasta,
                createdDesde: params?.createdDesde,
                createdHasta: params?.createdHasta,
                q: params?.q,
                page: params?.page,
                size: params?.size
            })
        });
    }

    getAsn(id: number): Observable<Asn> {
        return this.http.get<Asn>(`${this.baseUrl}/inventory/asn/${id}`);
    }

    createAsn(body: CreateAsnRequest): Observable<Asn> {
        return this.http.post<Asn>(`${this.baseUrl}/inventory/asn`, body);
    }

    /** Recibe un ASN: confirma cantidades, genera entradas al kardex y marca el estado. */
    receiveAsn(id: number, body: ReceiveAsnRequest): Observable<Asn> {
        return this.http.post<Asn>(`${this.baseUrl}/inventory/asn/${id}/receive`, body);
    }

    exportInventoryReport(params: {
        type: 'movements' | 'transfers' | 'counts';
        warehouseId?: number;
        status?: string;
        movementType?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Observable<Blob> {
        const httpParams = this.buildParams({
            reportType: params.type,
            warehouseId: params.warehouseId,
            status: params.status,
            movementType: params.movementType,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo
        });
        return this.http.get(`${this.baseUrl}/reports/inventory`, {
            params: httpParams,
            responseType: 'blob'
        });
    }
}
