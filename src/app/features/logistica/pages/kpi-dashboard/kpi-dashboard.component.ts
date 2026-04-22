import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { LogisticsDashboardService } from '../../services/logistics-dashboard.service';
import { LogisticsKpi, CarrierKpi } from '../../models/logistics-dashboard.model';

@Component({
    selector: 'app-kpi-dashboard',
    standalone: true,
    imports: [ReactiveFormsModule, DecimalPipe],
    templateUrl: './kpi-dashboard.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KpiDashboardComponent {
    private readonly dashboardService = inject(LogisticsDashboardService);
    private readonly fb = inject(FormBuilder);

    filterForm = this.fb.group({
        fromDate: [''],
        toDate:   ['']
    });

    loading = signal(false);
    error   = signal<string | null>(null);
    kpi     = signal<LogisticsKpi | null>(null);

    fulfillmentRatePct = computed(() => {
        const k = this.kpi();
        return k ? (k.fulfillmentRate * 100).toFixed(1) : '0.0';
    });

    avgDeliveryHours = computed(() => {
        const k = this.kpi();
        return k ? (k.avgDeliveryTimeDays * 24).toFixed(1) : '0.0';
    });

    carrierComparison = computed<CarrierKpi[]>(() => this.kpi()?.byCarrier ?? []);

    consultar(): void {
        const { fromDate, toDate } = this.filterForm.value;
        if (!fromDate || !toDate) {
            this.error.set('Selecciona las fechas de inicio y fin');
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        this.dashboardService.getKpis(fromDate, toDate).subscribe({
            next: (data) => {
                this.kpi.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Error al cargar KPIs');
                this.loading.set(false);
            }
        });
    }

    onTimeRateClass(rate: number): string {
        if (rate >= 0.9) return 'text-success';
        if (rate >= 0.75) return 'text-warning';
        return 'text-error';
    }
}
