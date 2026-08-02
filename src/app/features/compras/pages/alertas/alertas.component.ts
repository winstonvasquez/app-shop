import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { ButtonComponent } from '@shared/components';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { PageResponse } from '@core/models/pagination.model';

interface AlertaCompras {
    id: string;
    tipo: string;
    nivel: string;
    titulo: string;
    descripcion?: string;
    referenciaId?: string;
    referenciaTipo?: string;
    leida: boolean;
    leidaEn?: string;
    createdAt: string;
}

@Component({
    selector: 'app-alertas',
    standalone: true,
    imports: [DatePipe, ButtonComponent, AlertComponent],
    templateUrl: './alertas.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasComponent implements OnInit {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = `${environment.apiUrls.purchases}/api/alertas`;

    alertas = signal<AlertaCompras[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    generando = signal(false);
    filtroLeidas = signal<'todas' | 'no-leidas'>('no-leidas');

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.loading.set(true);
        this.error.set(null);
        const url = this.filtroLeidas() === 'no-leidas'
            ? `${this.baseUrl}/no-leidas`
            : this.baseUrl;
        // Los dos endpoints NO devuelven la misma forma: `/no-leidas` responde una lista y
        // `/alertas` un Page<T>. Tipar ambos como array hacía que al filtrar por «todas» la señal
        // guardara el objeto Page entero, y el `noLeidas()` de la plantilla reventaba con
        // «this.alertas(...).filter is not a function» — sin que la compilación viera nada.
        this.http.get<AlertaCompras[] | PageResponse<AlertaCompras>>(url, { headers: this.getHeaders() })
            .subscribe({
                next: data => {
                    this.alertas.set(Array.isArray(data) ? data : (data?.content ?? []));
                    this.loading.set(false);
                },
                error: () => {
                    // Antes se tragaba el error en silencio: la pantalla se quedaba vacía y
                    // parecía «no hay alertas» en vez de «no se pudieron cargar».
                    this.error.set('No se pudieron cargar las alertas de compras.');
                    this.alertas.set([]);
                    this.loading.set(false);
                },
            });
    }

    marcarLeida(id: string): void {
        this.http.put<AlertaCompras>(`${this.baseUrl}/${id}/leer`, {}, { headers: this.getHeaders() })
            .subscribe({
                next: updated => {
                    this.alertas.update(list => list.map(a => a.id === id ? updated : a));
                },
            });
    }

    marcarTodasLeidas(): void {
        this.http.put<number>(`${this.baseUrl}/leer-todas`, {}, { headers: this.getHeaders() })
            .subscribe({ next: () => this.cargar() });
    }

    generarAlertas(): void {
        this.generando.set(true);
        this.http.post<number>(`${this.baseUrl}/generar`, {}, { headers: this.getHeaders() })
            .subscribe({
                next: count => {
                    this.generando.set(false);
                    this.cargar();
                },
                error: () => this.generando.set(false),
            });
    }

    nivelClass(nivel: string): string {
        const map: Record<string, string> = {
            CRITICAL: 'badge-error',
            WARNING: 'badge-warning',
            INFO: 'badge-accent',
        };
        return `badge ${map[nivel] ?? 'badge-neutral'}`;
    }

    tipoIcon(tipo: string): string {
        const map: Record<string, string> = {
            REORDEN: '📦',
            PRESUPUESTO_SOBREEJECUTADO: '💸',
            FACTURA_VENCIDA: '📋',
        };
        return map[tipo] ?? '🔔';
    }

    noLeidas(): number {
        return this.alertas().filter(a => !a.leida).length;
    }
}
