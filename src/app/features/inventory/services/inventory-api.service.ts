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
    PageResponse
} from '../models/inventory.models';

export interface DashboardSummary {
    totalStock: number;
    lowStockProducts: number;
    pendingTransfers: number;
    recentMovements: InventoryMovement[];
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

    getStockByProduct(productId: number): Observable<InventoryStock[]> {
        return this.http.get<InventoryStock[]>(`${this.baseUrl}/inventory/stock/product/${productId}`);
    }

    getLowStock(): Observable<InventoryStock[]> {
        return this.http.get<InventoryStock[]>(`${this.baseUrl}/inventory/stock/below-minimum`);
    }

    createMovement(payload: InventoryMovementRequest): Observable<InventoryMovement> {
        return this.http.post<InventoryMovement>(`${this.baseUrl}/inventory/movements`, payload);
    }

    getMovements(params?: {
        warehouseId?: number;
        page?: number;
        size?: number;
        movementType?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Observable<PageResponse<InventoryMovement>> {
        const httpParams = this.buildParams({
            page: params?.page,
            size: params?.size,
            movementType: params?.movementType,
            dateFrom: params?.dateFrom,
            dateTo: params?.dateTo
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

    getTransfers(params?: {
        page?: number;
        size?: number;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        warehouseId?: number;
    }): Observable<PageResponse<InventoryTransfer>> {
        const httpParams = this.buildParams({
            page: params?.page,
            size: params?.size,
            status: params?.status,
            dateFrom: params?.dateFrom,
            dateTo: params?.dateTo,
            warehouseId: params?.warehouseId
        });
        return this.http.get<PageResponse<InventoryTransfer>>(`${this.baseUrl}/transfers`, { params: httpParams });
    }

    getPendingTransfers(): Observable<InventoryTransfer[]> {
        return this.http.get<InventoryTransfer[]>(`${this.baseUrl}/transfers/pending`);
    }

    createInventoryCount(payload: InventoryCountRequest): Observable<InventoryCount> {
        return this.http.post<InventoryCount>(`${this.baseUrl}/inventory/counts`, payload);
    }

    getInventoryCounts(params?: {
        page?: number;
        size?: number;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        warehouseId?: number;
    }): Observable<PageResponse<InventoryCount>> {
        const httpParams = this.buildParams({
            page: params?.page,
            size: params?.size,
            status: params?.status,
            dateFrom: params?.dateFrom,
            dateTo: params?.dateTo,
            warehouseId: params?.warehouseId
        });
        return this.http.get<PageResponse<InventoryCount>>(`${this.baseUrl}/inventory/counts`, { params: httpParams });
    }

    getKardexByProduct(productId: number): Observable<KardexEntry[]> {
        return this.http.get<KardexEntry[]>(`${this.baseUrl}/kardex/product/${productId}`);
    }

    getDashboardSummary(): Observable<DashboardSummary> {
        return this.http.get<DashboardSummary>(`${this.baseUrl}/dashboard/inventory`);
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
