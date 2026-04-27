import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface Address {
    id: number;
    tipoDireccion: string;
    departamento: string;
    provincia: string;
    distrito: string;
    direccion: string;
    referencia: string;
    ubigeo: string | null;
    esPrincipal: boolean;
    activo: boolean;
    fechaCreacion: string;
    nombreDestinatario: string | null;
    telefonoDestinatario: string | null;
}

export interface AddressInput {
    tipoDireccion?: string;
    departamento: string;
    provincia: string;
    distrito: string;
    direccion: string;
    referencia: string;
    ubigeo?: string;
    esPrincipal: boolean;
    nombreDestinatario: string;
    telefonoDestinatario: string;
}

@Injectable({ providedIn: 'root' })
export class AddressService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.sales}/api/clientes/me/direcciones`;

    getMyAddresses(): Observable<Address[]> {
        return this.http.get<Address[]>(this.baseUrl).pipe(catchError(this.handleError));
    }

    addAddress(data: AddressInput): Observable<Address> {
        return this.http
            .post<Address>(this.baseUrl, this.normalize(data))
            .pipe(catchError(this.handleError));
    }

    updateAddress(id: number, data: AddressInput): Observable<Address> {
        return this.http
            .put<Address>(`${this.baseUrl}/${id}`, this.normalize(data))
            .pipe(catchError(this.handleError));
    }

    deleteAddress(id: number): Observable<void> {
        return this.http
            .delete<void>(`${this.baseUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    setDefaultAddress(id: number): Observable<Address> {
        return this.http
            .put<Address>(`${this.baseUrl}/${id}/principal`, {})
            .pipe(catchError(this.handleError));
    }

    private normalize(data: AddressInput): AddressInput {
        return {
            tipoDireccion: data.tipoDireccion ?? 'ENVIO',
            departamento: data.departamento,
            provincia: data.provincia,
            distrito: data.distrito,
            direccion: data.direccion,
            referencia: data.referencia,
            ubigeo: data.ubigeo,
            esPrincipal: data.esPrincipal,
            nombreDestinatario: data.nombreDestinatario,
            telefonoDestinatario: data.telefonoDestinatario,
        };
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        const message =
            error.error?.message ??
            error.error?.detail ??
            (error.status === 0
                ? 'No se pudo conectar con el servidor'
                : `Error ${error.status}: ${error.statusText}`);
        return throwError(() => new Error(message));
    }
}
