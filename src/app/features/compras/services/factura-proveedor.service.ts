import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { FacturaProveedor, RegistrarFacturaRequest, CpeParsedInvoice } from '../models/factura-proveedor.model';
import { Page, adaptSpringPage } from '@core/models/pagination.model';
import { toHttpParams } from '@core/utils/http-params.util';

/** Filtros server-side del listado de facturas de proveedor. Todos opcionales. */
export interface FacturaProveedorFiltros {
    page?: number;
    size?: number;
    /** Búsqueda por texto: serie-número, proveedor y código de OC. */
    q?: string;
    estado?: string;
    tipoDocumento?: string;
    resultadoMatch?: string;
    estadoSunat?: string;
    moneda?: string;
    proveedorId?: string;
    /** 'true' | 'false' */
    conDetraccion?: string;
    /** yyyy-MM-dd */
    fechaEmisionDesde?: string;
    fechaEmisionHasta?: string;
    fechaVencimientoDesde?: string;
    fechaVencimientoHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class FacturaProveedorService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = `${environment.apiUrls.purchases}/api/facturas-proveedor`;

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    /**
     * Filtros del listado de facturas de proveedor. TODO el filtrado ocurre en el
     * backend (`GET /purchases/api/facturas-proveedor`); la vista nunca filtra la
     * página cargada.
     */
    listar(filtros: FacturaProveedorFiltros = {}): Observable<Page<FacturaProveedor>> {
        const page = filtros.page ?? 0;
        const size = filtros.size ?? 10;

        let params = toHttpParams({
            page,
            size,
            q: filtros.q,
            estado: filtros.estado,
            tipoDocumento: filtros.tipoDocumento,
            resultadoMatch: filtros.resultadoMatch,
            estadoSunat: filtros.estadoSunat,
            moneda: filtros.moneda,
            proveedorId: filtros.proveedorId,
            conDetraccion: filtros.conDetraccion,
            fechaEmisionDesde: filtros.fechaEmisionDesde,
            fechaEmisionHasta: filtros.fechaEmisionHasta,
            fechaVencimientoDesde: filtros.fechaVencimientoDesde,
            fechaVencimientoHasta: filtros.fechaVencimientoHasta,
        });

        return this.http.get<unknown>(this.baseUrl, { params, headers: this.getHeaders() }).pipe(
            map((raw: unknown) => adaptSpringPage<FacturaProveedor>(raw, page, size))
        );
    }

    getById(id: string): Observable<FacturaProveedor> {
        return this.http.get<FacturaProveedor>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
    }

    getByOrden(ordenCompraId: string): Observable<FacturaProveedor[]> {
        return this.http.get<FacturaProveedor[]>(`${this.baseUrl}/por-orden/${ordenCompraId}`, {
            headers: this.getHeaders(),
        });
    }

    registrar(request: RegistrarFacturaRequest): Observable<FacturaProveedor> {
        return this.http.post<FacturaProveedor>(this.baseUrl, request, { headers: this.getHeaders() });
    }

    aprobar(id: string): Observable<FacturaProveedor> {
        return this.http.post<FacturaProveedor>(`${this.baseUrl}/${id}/aprobar`, {}, {
            headers: this.getHeaders(),
        });
    }

    rechazar(id: string, motivo: string): Observable<FacturaProveedor> {
        return this.http.post<FacturaProveedor>(`${this.baseUrl}/${id}/rechazar`, { motivo }, {
            headers: this.getHeaders(),
        });
    }

    validarSunat(id: string): Observable<FacturaProveedor> {
        const sunatUrl = `${environment.apiUrls.purchases}/api/sunat/facturas/${id}/validar`;
        return this.http.post<FacturaProveedor>(sunatUrl, {}, { headers: this.getHeaders() });
    }

    /**
     * Parsea un XML de Comprobante de Pago Electrónico (UBL 2.1) del proveedor
     * y devuelve los datos para precargar el formulario de registro de factura.
     * NOTA: con `FormData` no se debe fijar `Content-Type` manualmente — el
     * browser agrega el boundary del multipart automáticamente.
     */
    parseCpe(file: File): Observable<CpeParsedInvoice> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<CpeParsedInvoice>(`${this.baseUrl}/cpe/parse`, formData, {
            headers: this.getHeaders(),
        });
    }
}
