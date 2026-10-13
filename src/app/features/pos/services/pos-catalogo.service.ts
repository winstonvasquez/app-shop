import { Injectable, inject } from '@angular/core';
import { Observable, Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ProductoCatalogoPOS } from '../models/catalogo-pos.model';
import { PageResponse } from '@core/models/pagination.model';
import { environment } from '@env/environment';
import { toHttpParams } from '@core/utils/http-params.util';

/** Filtros server-side del catálogo POS. Todos opcionales — ver GET /api/pos/catalogo. */
export interface PosCatalogoFiltros {
    q?: string;
    categoriaId?: number;
    marca?: string;
    unidadMedida?: string;
    /** 'CON_STOCK' | 'BAJO_MINIMO' | 'SIN_STOCK' */
    disponibilidad?: string;
}

@Injectable({ providedIn: 'root' })
export class PosCatalogoService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrls.pos + '/catalogo';

    /**
     * Carga el catálogo (primera carga o scroll). TODO el filtrado ocurre en el backend
     * (`GET /api/pos/catalogo`) — la vista nunca filtra la página cargada.
     */
    getCatalogo(
        companyId: number,
        filtros: PosCatalogoFiltros = {},
        page = 0,
        size = 200
    ): Observable<PageResponse<ProductoCatalogoPOS>> {
        let params = toHttpParams({
            companyId,
            page,
            size,
            q: filtros.q,
            categoriaId: filtros.categoriaId,
            marca: filtros.marca,
            unidadMedida: filtros.unidadMedida,
            disponibilidad: filtros.disponibilidad,
        });

        return this.http.get<PageResponse<ProductoCatalogoPOS>>(this.baseUrl, { params });
    }

    /**
     * Búsqueda reactiva: emite un stream de resultados conforme el usuario escribe.
     * Usa debounce 300ms + switchMap para cancelar peticiones anteriores.
     */
    buscarReactivo(
        queries$: Subject<string>,
        companyId: number,
        size = 200
    ): Observable<PageResponse<ProductoCatalogoPOS>> {
        return queries$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(q =>
                this.getCatalogo(companyId, { q: q || undefined }, 0, size)
            )
        );
    }
}
