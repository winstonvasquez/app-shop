import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface Address {
    id: number;
    nombreCompleto: string;
    telefono: string;
    departamento: string;
    provincia: string;
    distrito: string;
    direccionLinea1: string;
    referencia: string;
    esPrincipal: boolean;
}

export interface AddressInput {
    nombreCompleto: string;
    telefono: string;
    departamento: string;
    provincia: string;
    distrito: string;
    direccionLinea1: string;
    referencia: string;
    esPrincipal: boolean;
}

@Injectable({ providedIn: 'root' })
export class AddressService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.users}/api/clientes/me/direcciones`;

    getMyAddresses(): Observable<Address[]> {
        return this.http.get<Address[]>(this.baseUrl).pipe(catchError(this.handleError));
    }

    addAddress(data: AddressInput): Observable<Address> {
        return this.http.post<Address>(this.baseUrl, data).pipe(catchError(this.handleError));
    }

    updateAddress(id: number, data: AddressInput): Observable<Address> {
        return this.http
            .put<Address>(`${this.baseUrl}/${id}`, data)
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

    private handleError(error: HttpErrorResponse): Observable<never> {
        const message =
            error.error?.message ??
            (error.status === 0
                ? 'No se pudo conectar con el servidor'
                : `Error ${error.status}: ${error.statusText}`);
        return throwError(() => new Error(message));
    }
}
