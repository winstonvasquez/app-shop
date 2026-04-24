import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface FulfillmentOptimizeBody {
    orderId: string;
    companyId: string;
}

export interface FulfillmentOptimizeResult {
    orderId: string;
    recommendedWarehouseId: string;
    recommendedCarrierId: string;
    estimatedDeliveryDays: number;
    score: number;
    reasons: string[];
}

@Injectable({ providedIn: 'root' })
export class FulfillmentService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/fulfillment`;

    optimize(body: FulfillmentOptimizeBody): Observable<FulfillmentOptimizeResult> {
        return this.http.post<FulfillmentOptimizeResult>(`${this.baseUrl}/optimize`, body);
    }
}
