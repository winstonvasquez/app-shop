import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';
import { RolDto } from '@features/admin/models/user.model';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';

@Injectable({
    providedIn: 'root'
})
export class RolService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.users}/api/roles`;

    /**
     * Get all roles
     */
    getAll(): Observable<RolDto[]> {
        return this.http
            .get<RolDto[]>(this.baseUrl)
            .pipe(catchError(this.handleError));
    }

    /**
     * Handle HTTP errors
     */
    private handleError(error: HttpErrorResponse): Observable<never> {
        console.error('RolService Error:', error);
        return throwError(() => new Error(mensajeDeErrorHttp(error)));
    }
}
