import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class PleService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrls.accounting}/api/v1/contabilidad/sunat/ple`;

    /** Descarga PLE Libro 14 (Registro de Ventas) como blob TXT ISO-8859-1 */
    descargarLibro14(periodoId: string, ruc: string) {
        const params = new HttpParams().set('ruc', ruc);
        return this.http.get(`${this.base}/libro-14/${periodoId}`, {
            params,
            responseType: 'blob',
            observe: 'response',
        });
    }

    /** Descarga PLE Libro 08 (Registro de Compras) como blob TXT ISO-8859-1 */
    descargarLibro08(periodoId: string, ruc: string) {
        const params = new HttpParams().set('ruc', ruc);
        return this.http.get(`${this.base}/libro-08/${periodoId}`, {
            params,
            responseType: 'blob',
            observe: 'response',
        });
    }
}
