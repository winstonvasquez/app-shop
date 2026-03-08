import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

export interface Banner {
    id: number;
    titulo: string;
    subtitulo: string;
    imagenUrl: string;
    link: string;
    orden: number;
}

@Injectable({
    providedIn: 'root'
})
export class BannerService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrls.sales}/api/v1/banners`;

    getAll(): Observable<Banner[]> {
        return this.http.get<Banner[]>(this.apiUrl);
    }
}
