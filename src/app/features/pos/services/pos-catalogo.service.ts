import { Injectable, inject } from '@angular/core';
import { Observable, Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ProductoCatalogoPOS } from '../models/catalogo-pos.model';
import { PageResponse } from '../models/venta-pos.model';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class PosCatalogoService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrls.pos + '/catalogo';

    /** Carga el catálogo completo (primera carga o scroll) */
    getCatalogo(
        companyId: number,
        q?: string,
        categoriaId?: number,
        page = 0,
        size = 200
    ): Observable<PageResponse<ProductoCatalogoPOS>> {
        let params = new HttpParams()
            .set('companyId', companyId.toString())
            .set('page', page.toString())
            .set('size', size.toString());

        if (q) params = params.set('q', q);
        if (categoriaId) params = params.set('categoriaId', categoriaId.toString());

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
                this.getCatalogo(companyId, q || undefined, undefined, 0, size)
            )
        );
    }
}
