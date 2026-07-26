import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { TransportistaService } from '../../services/transportista.service';
import { Transportista } from '../../models/transportista.model';
import { CarrierSlaService } from '../../services/carrier-sla.service';
import {
    CarrierSla,
    CarrierPerformanceMetric,
    CarrierDashboard,
    CarrierRecommendation,
    CARRIER_SLA_METRICS,
    CARRIER_SLA_PERIODS
} from '../../models/carrier-sla.model';
import { ButtonComponent, CatalogSelectComponent } from '@shared/components';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { ROUTES } from '@shared/constants/app.constants';

@Component({
    selector: 'app-carrier-sla-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule, FormsModule, DecimalPipe,
        ButtonComponent, CatalogSelectComponent,
        DataTableComponent, DrawerComponent, ModalComponent,
        AlertComponent, FormFieldComponent, PageHeaderComponent
    ],
    templateUrl: './carrier-sla-management.component.html'
})
export class CarrierSlaManagementComponent implements OnInit {
    private readonly transportistaService = inject(TransportistaService);
    private readonly slaService = inject(CarrierSlaService);
    private readonly authService = inject(AuthService);
    private readonly fb = inject(FormBuilder);

    readonly metricOptions = CARRIER_SLA_METRICS;
    readonly periodOptions = CARRIER_SLA_PERIODS;

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Logística', url: '/admin/logistica/dashboard' },
        { label: 'Transportistas', url: '/admin/logistica/transportistas' },
        { label: 'SLA' }
    ];

    // ── Selector de transportista ────────────────────────────────────────
    carriers = signal<Transportista[]>([]);
    carriersLoading = signal(false);
    selectedCarrierId = signal<string | null>(null);

    selectedCarrier = computed<Transportista | null>(() =>
        this.carriers().find(c => c.id === this.selectedCarrierId()) ?? null
    );

    // ── Dashboard / SLAs / Performance del transportista elegido ────────
    loading = signal(false);
    error = signal<string | null>(null);
    dashboard = signal<CarrierDashboard | null>(null);
    slas = signal<CarrierSla[]>([]);
    performance = signal<CarrierPerformanceMetric[]>([]);

    // ── Drawer CRUD de SLA ────────────────────────────────────────────────
    showSlaDrawer = signal(false);
    editMode = signal(false);
    selectedSlaId = signal<string | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    showConfirmDelete = signal(false);
    pendingDeleteId = signal<string | null>(null);

    slaForm: FormGroup = this.fb.nonNullable.group({
        metric: ['ON_TIME_RATE', Validators.required],
        targetValue: [0, [Validators.required, Validators.min(0)]],
        warningThreshold: [null as number | null],
        criticalThreshold: [null as number | null],
        measurementPeriod: ['MONTHLY', Validators.required]
    });

    slaColumns: TableColumn<CarrierSla>[] = [
        { key: 'metric', label: 'Métrica', render: (r) => this.metricLabel(r.metric) },
        { key: 'targetValue', label: 'Objetivo', align: 'right' },
        { key: 'warningThreshold', label: 'Umbral Advertencia', align: 'right',
          render: (r) => r.warningThreshold != null ? String(r.warningThreshold) : '—' },
        { key: 'criticalThreshold', label: 'Umbral Crítico', align: 'right',
          render: (r) => r.criticalThreshold != null ? String(r.criticalThreshold) : '—' },
        { key: 'measurementPeriod', label: 'Período', render: (r) => this.periodLabel(r.measurementPeriod) }
    ];

    slaActions: TableAction<CarrierSla>[] = [
        { label: 'Editar', icon: 'edit', class: 'btn-icon-edit', onClick: (r) => this.openEditSla(r) },
        { label: 'Eliminar', icon: 'trash', class: 'btn-icon-delete', onClick: (r) => this.confirmDeleteSla(r.id) }
    ];

    performanceColumns: TableColumn<CarrierPerformanceMetric>[] = [
        { key: 'periodStart', label: 'Desde', render: (r) => this.formatDate(r.periodStart) },
        { key: 'periodEnd', label: 'Hasta', render: (r) => this.formatDate(r.periodEnd) },
        { key: 'totalShipments', label: 'Envíos', align: 'right' },
        { key: 'onTimeRate', label: 'A tiempo (%)', align: 'right',
          render: (r) => (r.onTimeRate * 100).toFixed(1) + '%' },
        { key: 'avgDeliveryHours', label: 'Horas prom.', align: 'right',
          render: (r) => Number(r.avgDeliveryHours).toFixed(1) },
        { key: 'failureRate', label: 'Fallos (%)', align: 'right',
          render: (r) => (r.failureRate * 100).toFixed(1) + '%' },
        { key: 'damageRate', label: 'Daños (%)', align: 'right',
          render: (r) => (r.damageRate * 100).toFixed(1) + '%' },
        { key: 'totalCost', label: 'Costo Total', align: 'right',
          render: (r) => 'S/ ' + Number(r.totalCost).toFixed(2) }
    ];

    // ── Recomendación de transportista ───────────────────────────────────
    recommendForm: FormGroup = this.fb.nonNullable.group({
        departamento: ['', Validators.required],
        provincia: [''],
        weight: [1, [Validators.required, Validators.min(0.01)]],
        serviceType: ['']
    });

    recommendLoading = signal(false);
    recommendError = signal<string | null>(null);
    recommendResults = signal<CarrierRecommendation[]>([]);

    private get companyId(): string {
        return String(this.authService.currentUser()?.activeCompanyId ?? 1);
    }

    ngOnInit(): void {
        this.loadCarriers();
    }

    loadCarriers(): void {
        this.carriersLoading.set(true);
        // NOTA (ronda 2, hallazgo verificado): CarrierController.getAllCarriers()
        // (backend) devuelve un array plano List<CarrierResponse> — NO un objeto
        // paginado {content,...} como asume TransportistaService/TransportistaPage
        // (mismatch pre-existente, fuera del scope de esta página). Se normaliza
        // defensivamente para no heredar el bug en este selector nuevo.
        this.transportistaService.getTransportistas(this.companyId, 0, 100).subscribe({
            next: (res) => {
                const list = Array.isArray(res) ? res : (res?.content ?? []);
                this.carriers.set(list);
                this.carriersLoading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.carriersLoading.set(false); }
        });
    }

    onCarrierSelected(id: string): void {
        this.selectedCarrierId.set(id || null);
        this.recommendResults.set([]);
        if (this.selectedCarrierId()) {
            this.loadAll();
        } else {
            this.dashboard.set(null);
            this.slas.set([]);
            this.performance.set([]);
        }
    }

    loadAll(): void {
        const carrierId = this.selectedCarrierId();
        if (!carrierId) return;
        this.loading.set(true);
        this.error.set(null);
        forkJoin({
            dashboard: this.slaService.getDashboard(carrierId),
            slas: this.slaService.getSlas(carrierId),
            performance: this.slaService.getPerformance(carrierId)
        }).subscribe({
            next: ({ dashboard, slas, performance }) => {
                this.dashboard.set(dashboard);
                this.slas.set(slas);
                this.performance.set(performance);
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message ?? 'Error al cargar SLA/performance del transportista.');
                this.loading.set(false);
            }
        });
    }

    loadSlas(): void {
        const carrierId = this.selectedCarrierId();
        if (!carrierId) return;
        this.slaService.getSlas(carrierId).subscribe({
            next: (data) => this.slas.set(data),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    // ── CRUD SLA ──────────────────────────────────────────────────────────
    openCreateSla(): void {
        this.editMode.set(false);
        this.selectedSlaId.set(null);
        this.slaForm.reset({ metric: 'ON_TIME_RATE', targetValue: 0, measurementPeriod: 'MONTHLY' });
        this.submitError.set(null);
        this.showSlaDrawer.set(true);
    }

    openEditSla(sla: CarrierSla): void {
        this.editMode.set(true);
        this.selectedSlaId.set(sla.id);
        this.slaForm.patchValue({
            metric: sla.metric,
            targetValue: sla.targetValue,
            warningThreshold: sla.warningThreshold ?? null,
            criticalThreshold: sla.criticalThreshold ?? null,
            measurementPeriod: sla.measurementPeriod
        });
        this.submitError.set(null);
        this.showSlaDrawer.set(true);
    }

    closeSlaDrawer(): void {
        this.showSlaDrawer.set(false);
    }

    submitSla(): void {
        const carrierId = this.selectedCarrierId();
        if (!carrierId || this.slaForm.invalid) { this.slaForm.markAllAsTouched(); return; }

        this.submitting.set(true);
        this.submitError.set(null);
        const v = this.slaForm.getRawValue();
        const payload = {
            metric: v.metric,
            targetValue: v.targetValue,
            warningThreshold: v.warningThreshold,
            criticalThreshold: v.criticalThreshold,
            measurementPeriod: v.measurementPeriod
        };

        const op = this.editMode()
            ? this.slaService.updateSla(carrierId, this.selectedSlaId()!, payload)
            : this.slaService.createSla(carrierId, payload);

        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeSlaDrawer();
                this.loadSlas();
            },
            error: (err: Error) => {
                this.submitError.set(err.message ?? 'Error al guardar el SLA.');
                this.submitting.set(false);
            }
        });
    }

    confirmDeleteSla(id: string): void {
        this.pendingDeleteId.set(id);
        this.showConfirmDelete.set(true);
    }

    cancelDeleteSla(): void {
        this.pendingDeleteId.set(null);
        this.showConfirmDelete.set(false);
    }

    executeDeleteSla(): void {
        const carrierId = this.selectedCarrierId();
        const slaId = this.pendingDeleteId();
        if (!carrierId || !slaId) return;
        this.showConfirmDelete.set(false);
        this.slaService.deleteSla(carrierId, slaId).subscribe({
            next: () => { this.pendingDeleteId.set(null); this.loadSlas(); },
            error: (err: Error) => { this.pendingDeleteId.set(null); this.error.set(err.message); }
        });
    }

    // ── Recomendación ─────────────────────────────────────────────────────
    recommend(): void {
        if (this.recommendForm.invalid) { this.recommendForm.markAllAsTouched(); return; }
        this.recommendLoading.set(true);
        this.recommendError.set(null);
        const v = this.recommendForm.getRawValue();
        this.slaService.recommend({
            departamento: v.departamento,
            provincia: v.provincia || undefined,
            weight: v.weight,
            serviceType: v.serviceType || undefined
        }).subscribe({
            next: (results) => {
                this.recommendResults.set(results);
                this.recommendLoading.set(false);
            },
            error: (err: Error) => {
                this.recommendError.set(err.message ?? 'Error al recomendar transportista.');
                this.recommendLoading.set(false);
            }
        });
    }

    // ── Helpers de presentación ───────────────────────────────────────────
    metricLabel(value: string): string {
        return this.metricOptions.find(m => m.value === value)?.label ?? value;
    }

    periodLabel(value: string): string {
        return this.periodOptions.find(p => p.value === value)?.label ?? value;
    }

    formatDate(iso: string): string {
        return iso ? new Date(iso).toLocaleDateString('es-PE') : '—';
    }

    onTimeRateClass(rate: number): string {
        if (rate >= 0.9) return 'text-success';
        if (rate >= 0.75) return 'text-warning';
        return 'text-error';
    }

    scoreBreakdownEntries(rec: CarrierRecommendation): [string, number][] {
        return Object.entries(rec.scoreBreakdown ?? {});
    }

    getCtrl(form: FormGroup, name: string): FormControl {
        return form.get(name) as FormControl;
    }
}
