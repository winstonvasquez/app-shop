import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { SaasPlanAdmin, SaasPlanAdminRequest, SaasPlanAdminService } from '@features/admin/services/saas-plan-admin.service';
import { PortalService } from '@features/portal/services/portal.service';
import { SaasModuleInfo } from '@core/models/saas.model';

@Component({
    selector: 'app-saas-plans',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonComponent, DrawerComponent],
    templateUrl: './saas-plans.component.html',
    styleUrl: './saas-plans.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SaasPlansComponent implements OnInit {
    private readonly saasPlanAdminService = inject(SaasPlanAdminService);
    private readonly portalService = inject(PortalService);
    private readonly fb = inject(FormBuilder);

    plans = signal<SaasPlanAdmin[]>([]);
    modules = signal<SaasModuleInfo[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    showDrawer = signal(false);
    editMode = signal(false);
    selectedPlanId = signal<number | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    planForm = this.fb.group({
        code: ['', [Validators.required, Validators.maxLength(50)]],
        name: ['', [Validators.required, Validators.maxLength(100)]],
        description: [''],
        priceMonthly: [0, [Validators.required, Validators.min(0)]],
        priceAnnual: [0, [Validators.required, Validators.min(0)]],
        maxUsers: [5, [Validators.required, Validators.min(1)]],
        moduleCodes: this.fb.control<string[]>([])
    });

    ngOnInit(): void {
        this.loadPlans();
        this.portalService.getModules().subscribe({
            next: (modules) => this.modules.set(modules),
            error: () => this.modules.set([])
        });
    }

    loadPlans(): void {
        this.loading.set(true);
        this.error.set(null);
        this.saasPlanAdminService.getAll().subscribe({
            next: (plans) => {
                this.plans.set(plans);
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    openCreateModal(): void {
        this.editMode.set(false);
        this.selectedPlanId.set(null);
        this.planForm.reset({ priceMonthly: 0, priceAnnual: 0, maxUsers: 5, moduleCodes: [] });
        this.showDrawer.set(true);
        this.submitError.set(null);
    }

    openEditModal(plan: SaasPlanAdmin): void {
        this.editMode.set(true);
        this.selectedPlanId.set(plan.id);
        this.planForm.reset({
            code: plan.code,
            name: plan.name,
            description: plan.description ?? '',
            priceMonthly: plan.priceMonthly,
            priceAnnual: plan.priceAnnual,
            maxUsers: plan.maxUsers,
            moduleCodes: [...plan.moduleCodes]
        });
        this.showDrawer.set(true);
        this.submitError.set(null);
    }

    closeModal(): void {
        this.showDrawer.set(false);
    }

    isModuleSelected(code: string): boolean {
        return (this.planForm.value.moduleCodes ?? []).includes(code);
    }

    toggleModule(code: string): void {
        const current = this.planForm.value.moduleCodes ?? [];
        const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
        this.planForm.patchValue({ moduleCodes: next });
    }

    onSubmit(): void {
        if (this.planForm.invalid) {
            this.planForm.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.submitError.set(null);

        const value = this.planForm.value;
        const request: SaasPlanAdminRequest = {
            code: value.code!,
            name: value.name!,
            description: value.description || null,
            priceMonthly: Number(value.priceMonthly),
            priceAnnual: Number(value.priceAnnual),
            maxUsers: Number(value.maxUsers),
            moduleCodes: value.moduleCodes ?? []
        };

        const operation = this.editMode()
            ? this.saasPlanAdminService.update(this.selectedPlanId()!, request)
            : this.saasPlanAdminService.create(request);

        operation.subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeModal();
                this.loadPlans();
            },
            error: (err: Error) => {
                this.submitError.set(err.message);
                this.submitting.set(false);
            }
        });
    }

    toggleActive(plan: SaasPlanAdmin): void {
        const action = plan.isActive ? this.saasPlanAdminService.deactivate(plan.id) : this.saasPlanAdminService.activate(plan.id);
        action.subscribe({
            next: () => this.loadPlans(),
            error: (err: Error) => this.error.set(err.message)
        });
    }
}
