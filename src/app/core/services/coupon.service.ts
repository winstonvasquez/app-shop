import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface CuponResponse {
    id: number;
    codigo: string | null;
    nombre: string;
    descripcion: string | null;
    tipo: string;
    valor: number;
    fechaFin: string;
    status: 'ACTIVE' | 'USED' | 'EXPIRED';
    usedAt: string | null;
}

export interface ValidateCouponResponse {
    valid: boolean;
    codigo: string;
    tipo: string | null;
    valor: number | null;
    mensaje: string;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
}

@Injectable({ providedIn: 'root' })
export class CouponService {
    private http = inject(HttpClient);
    private readonly base = `${environment.apiUrls.sales}/api/cupones`;

    getMyCupones(page = 0, size = 20): Observable<PageResponse<CuponResponse>> {
        return this.http.get<PageResponse<CuponResponse>>(
            `${this.base}/mine`, { params: { page, size } }
        );
    }

    validate(code: string): Observable<ValidateCouponResponse> {
        return this.http.get<ValidateCouponResponse>(
            `${this.base}/validate`, { params: { code } }
        );
    }
}
