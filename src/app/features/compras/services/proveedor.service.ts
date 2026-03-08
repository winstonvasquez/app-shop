import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Proveedor, ProveedorPage } from '../models/proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedorService {
    private http = inject(HttpClient);
    private baseUrl = `${environment.apiUrl}/purchases/api/proveedores`;

    getProveedores(page = 0, size = 20, estado?: string): Observable<ProveedorPage> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());
        
        if (estado) {
            params = params.set('estado', estado);
        }

        return this.http.get<ProveedorPage>(this.baseUrl, { params });
    }

    getProveedorById(id: string): Observable<Proveedor> {
        return this.http.get<Proveedor>(`${this.baseUrl}/${id}`);
    }

    getProveedorByRuc(ruc: string): Observable<Proveedor> {
        return this.http.get<Proveedor>(`${this.baseUrl}/ruc/${ruc}`);
    }

    createProveedor(proveedor: Proveedor): Observable<Proveedor> {
        return this.http.post<Proveedor>(this.baseUrl, proveedor);
    }

    updateProveedor(id: string, proveedor: Proveedor): Observable<Proveedor> {
        return this.http.put<Proveedor>(`${this.baseUrl}/${id}`, proveedor);
    }

    deleteProveedor(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}
