import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class BarcodeService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/barcodes`;

    getProductBarcode(sku: string): Observable<Blob> {
        return this.http.get(`${this.baseUrl}/product/${sku}`, { responseType: 'blob' });
    }

    getTrackingQr(trackingNumber: string): Observable<Blob> {
        return this.http.get(`${this.baseUrl}/tracking/${trackingNumber}/qr`, { responseType: 'blob' });
    }
}
