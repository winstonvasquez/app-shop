import { Component, signal, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '@env/environment';
import { ErpHealthCardComponent } from '@features/admin/components/erp-health-card/erp-health-card.component';
import { DashboardKpis, MetricCard, metricasDeDashboard } from './dashboard.metricas';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [TranslateModule, ErpHealthCardComponent],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
    private readonly http = inject(HttpClient);

    metrics = signal<MetricCard[]>([]);
    error = signal<string | null>(null);

    ngOnInit(): void {
        this.http.get<DashboardKpis>(`${environment.apiUrls.analytics}/api/analytics/dashboard`).subscribe({
            next: (d) => this.metrics.set(metricasDeDashboard(d)),
            error: () => this.error.set('Analítica no disponible: no se pudo obtener ningún KPI.'),
        });
    }
}
