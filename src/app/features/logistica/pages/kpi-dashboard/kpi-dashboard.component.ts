import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { LogisticsDashboardService } from '../../services/logistics-dashboard.service';
import { ShippingCostService } from '../../services/shipping-cost.service';
import { LogisticsKpi, CarrierKpi } from '../../models/logistics-dashboard.model';
import { CostAnalytics, CostByCarrier } from '../../models/shipping-cost.model';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-kpi-dashboard',
    standalone: true,
    imports: [ReactiveFormsModule, DecimalPipe, ButtonComponent],
    templateUrl: './kpi-dashboard.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KpiDashboardComponent {
    private readonly dashboardService = inject(LogisticsDashboardService);
    private readonly shippingCostService = inject(ShippingCostService);
    private readonly fb = inject(FormBuilder);

    filterForm = this.fb.group({
        fromDate: [''],
        toDate:   ['']
    });

    loading = signal(false);
    error   = signal<string | null>(null);
    kpi     = signal<LogisticsKpi | null>(null);

    costLoading  = signal(false);
    costAnalytics = signal<CostAnalytics | null>(null);

    fulfillmentRatePct = computed(() => {
        const k = this.kpi();
        return k ? (k.fulfillmentRate * 100).toFixed(1) : '0.0';
    });

    avgDeliveryHours = computed(() => {
        const k = this.kpi();
        return k ? (k.avgDeliveryTimeDays * 24).toFixed(1) : '0.0';
    });

    carrierComparison = computed<CarrierKpi[]>(() => this.kpi()?.byCarrier ?? []);

    costByCarrier = computed<CostByCarrier[]>(() => this.costAnalytics()?.byCarrier ?? []);

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

        // Costos de envío: widget independiente — un fallo acá no debe tumbar los KPIs principales.
        this.costLoading.set(true);
        this.shippingCostService.getAnalytics(fromDate, toDate).subscribe({
            next: (data) => {
                this.costAnalytics.set(data);
                this.costLoading.set(false);
            },
            error: () => {
                this.costAnalytics.set(null);
                this.costLoading.set(false);
            }
        });
    }

    onTimeRateClass(rate: number): string {
        if (rate >= 0.9) return 'text-success';
        if (rate >= 0.75) return 'text-warning';
        return 'text-error';
    }
}
