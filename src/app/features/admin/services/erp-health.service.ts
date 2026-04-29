import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ErpHealthResponse } from '@features/admin/models/erp-health.model';

/**
 * Cliente del endpoint /accounting/api/admin/erp-health (proxy → microshopcontabilidad
 * 8084 con rewrite /accounting → /finance). Devuelve estado consolidado del outbox
 * de ventas, compras y logística en una sola llamada.
 */
@Injectable({ providedIn: 'root' })
export class ErpHealthService {
    private readonly http = inject(HttpClient);
    private readonly url = `${environment.apiUrls.accounting}/api/admin/erp-health`;

    getHealth(): Observable<ErpHealthResponse> {
        return this.http.get<ErpHealthResponse>(this.url);
    }
}
