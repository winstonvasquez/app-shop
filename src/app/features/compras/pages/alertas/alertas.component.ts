import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';

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
    imports: [DatePipe],
    templateUrl: './alertas.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasComponent implements OnInit {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private baseUrl = `${environment.apiUrls.purchases}/api/alertas`;

    alertas = signal<AlertaCompras[]>([]);
    loading = signal(false);
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
        const url = this.filtroLeidas() === 'no-leidas'
            ? `${this.baseUrl}/no-leidas`
            : this.baseUrl;
        this.http.get<AlertaCompras[]>(url, { headers: this.getHeaders() }).subscribe({
            next: data => { this.alertas.set(data); this.loading.set(false); },
            error: () => this.loading.set(false),
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
