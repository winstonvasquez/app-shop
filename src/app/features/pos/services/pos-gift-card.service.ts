import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { GiftCard } from '../models/venta-pos.model';

export interface GiftCardCreateDto {
    companyId: number;
    saldoInicial: number;
    moneda?: string;
    clienteId?: number;
    clienteNombre?: string;
}

export interface GiftCardConsumoResponse {
    montoConsumido: number;
    saldoRestante: number;
}

@Injectable({ providedIn: 'root' })
export class PosGiftCardService {

    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrls.pos;

    buscarPorCodigo(codigo: string): Observable<GiftCard> {
        return this.http.get<GiftCard>(`${this.baseUrl}/gift-cards/buscar`, {
            params: new HttpParams().set('codigo', codigo),
        });
    }

    getByCompany(companyId: number): Observable<GiftCard[]> {
        return this.http.get<GiftCard[]>(`${this.baseUrl}/gift-cards`, {
            params: new HttpParams().set('companyId', companyId.toString()),
        });
    }

    crear(dto: GiftCardCreateDto): Observable<GiftCard> {
        return this.http.post<GiftCard>(`${this.baseUrl}/gift-cards`, dto);
    }

    consumir(codigo: string, monto: number, referencia?: string): Observable<GiftCardConsumoResponse> {
        let params = new HttpParams().set('monto', monto.toString());
        if (referencia) {
            params = params.set('referencia', referencia);
        }
        return this.http.post<GiftCardConsumoResponse>(
            `${this.baseUrl}/gift-cards/${codigo}/consumir`,
            null,
            { params },
        );
    }

    recargar(codigo: string, monto: number): Observable<GiftCard> {
        const params = new HttpParams().set('monto', monto.toString());
        return this.http.post<GiftCard>(
            `${this.baseUrl}/gift-cards/${codigo}/recargar`,
            null,
            { params },
        );
    }
}
