import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface PosFavorito {
    id: number;
    varianteId: number;
    sku: string;
    nombre: string;
    precioFinal: number;
    stockActual: number;
    imagenUrl: string | null;
    posicion: number;
    color: string | null;
}

export interface PosFavoritoCreate {
    companyId: number;
    varianteId: number;
    posicion?: number;
    color?: string;
    cajeroId?: number;
}

@Injectable({ providedIn: 'root' })
export class PosFavoritosService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrls.pos + '/favoritos';

    getFavoritos(companyId: number, cajeroId = 0): Observable<PosFavorito[]> {
        const params = new HttpParams()
            .set('companyId', companyId.toString())
            .set('cajeroId', cajeroId.toString());
        return this.http.get<PosFavorito[]>(this.baseUrl, { params });
    }

    crear(dto: PosFavoritoCreate): Observable<PosFavorito> {
        return this.http.post<PosFavorito>(this.baseUrl, dto);
    }

    actualizar(id: number, posicion?: number, color?: string): Observable<PosFavorito> {
        let params = new HttpParams();
        if (posicion != null) params = params.set('posicion', posicion.toString());
        if (color != null) params = params.set('color', color);
        return this.http.put<PosFavorito>(`${this.baseUrl}/${id}`, null, { params });
    }

    eliminar(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
