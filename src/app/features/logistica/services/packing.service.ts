import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { CreatePackingBody, PackingOrder, PackingOrderStatus } from '../models/packing.model';
import { PickingOrder } from '../models/picking.model';

/** Contrato real: PackingController (`/logistics/api/packing`); las mutaciones son PUT y las listas, List<T>. */
@Injectable({ providedIn: 'root' })
export class PackingService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/packing`;

    getAll(): Observable<PackingOrder[]> {
        return this.http.get<PackingOrder[]>(this.baseUrl);
    }

    getByStatus(status: PackingOrderStatus): Observable<PackingOrder[]> {
        return this.http.get<PackingOrder[]>(`${this.baseUrl}/status/${status}`);
    }

    create(body: CreatePackingBody): Observable<PackingOrder> {
        return this.http.post<PackingOrder>(this.baseUrl, body);
    }

    completeOrder(id: string): Observable<PackingOrder> {
        return this.http.put<PackingOrder>(`${this.baseUrl}/${id}/complete`, {});
    }

    markReadyToShip(id: string): Observable<PackingOrder> {
        return this.http.put<PackingOrder>(`${this.baseUrl}/${id}/ready-to-ship`, {});
    }

    /** Picking orders PICKED: origen del alta de packing (GET /picking/status/PICKED). */
    getPickedOrders(): Observable<PickingOrder[]> {
        return this.http.get<PickingOrder[]>(`${environment.apiUrls.logistics}/api/picking/status/PICKED`);
    }
}
