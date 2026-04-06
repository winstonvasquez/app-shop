import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { CompanyService } from '@features/admin/services/company.service';
import {
    CompanyResponse,
    CompanyRequest,
    CompanyModuleResponse,
    CompanyUserResponse,
    CompanySubscriptionResponse
} from '@features/admin/models/company.model';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';

type DetailTab = 'perfil' | 'modulos' | 'usuarios' | 'suscripcion';

@Component({
    selector: 'app-company-detail',
    standalone: true,
    imports: [DatePipe, ReactiveFormsModule, FormFieldComponent, PageHeaderComponent, AlertComponent],
    templateUrl: './company-detail.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompanyDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly companyService = inject(CompanyService);
    private readonly fb = inject(FormBuilder);

    // State
    readonly company = signal<CompanyResponse | null>(null);
    readonly modules = signal<CompanyModuleResponse[]>([]);
    readonly users = signal<CompanyUserResponse[]>([]);
    readonly subscription = signal<CompanySubscriptionResponse | null>(null);
    readonly activeTab = signal<DetailTab>('perfil');
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly successMsg = signal<string | null>(null);
    readonly editingProfile = signal(false);

    // Form
    profileForm: FormGroup;

    // Computed
    readonly companyName = computed(() => this.company()?.name ?? 'Empresa');
    readonly breadcrumbs = computed<Breadcrumb[]>(() => [
        { label: 'Admin', url: '/admin' },
        { label: 'Empresas', url: '/admin/companies' },
        { label: this.companyName() }
    ]);
    readonly enabledModulesCount = computed(() => this.modules().filter(m => m.enabled).length);
    readonly totalModules = computed(() => this.modules().length);
    readonly activeUsersCount = computed(() => this.users().filter(u => u.isActive).length);

    constructor() {
        this.profileForm = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(100)]],
            ruc: ['', [Validators.required, Validators.pattern(/^[0-9]{11}$/)]],
            active: [true],
            legalName: ['', [Validators.maxLength(200)]],
            address: ['', [Validators.maxLength(300)]],
            phone: ['', [Validators.maxLength(20)]],
            email: ['', [Validators.email, Validators.maxLength(100)]],
            logoUrl: ['', [Validators.maxLength(500)]],
            domain: ['', [Validators.maxLength(100)]]
        });
    }

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id) {
            this.router.navigate(['/admin/companies']);
            return;
        }
        this.loadCompany(id);
    }

    getControl(name: string): FormControl {
        return this.profileForm.get(name) as FormControl;
    }

    setTab(tab: DetailTab): void {
        this.activeTab.set(tab);
        const company = this.company();
        if (!company) return;

        if (tab === 'modulos' && this.modules().length === 0) {
            this.loadModules(company.id);
        }
        if (tab === 'usuarios' && this.users().length === 0) {
            this.loadUsers(company.id);
        }
        if (tab === 'suscripcion' && !this.subscription()) {
            this.loadSubscription(company.id);
        }
    }

    startEditing(): void {
        const c = this.company();
        if (!c) return;
        this.profileForm.patchValue({
            name: c.name,
            ruc: c.ruc,
            active: c.isActive,
            legalName: c.legalName ?? '',
            address: c.address ?? '',
            phone: c.phone ?? '',
            email: c.email ?? '',
            logoUrl: c.logoUrl ?? '',
            domain: c.domain ?? ''
        });
        this.editingProfile.set(true);
    }

    cancelEditing(): void {
        this.editingProfile.set(false);
    }

    saveProfile(): void {
        if (this.profileForm.invalid) {
            this.profileForm.markAllAsTouched();
            return;
        }
        const c = this.company();
        if (!c) return;

        this.saving.set(true);
        const fv = this.profileForm.value;
        const request: CompanyRequest = {
            name: fv.name,
            ruc: fv.ruc,
            active: fv.active,
            legalName: fv.legalName || undefined,
            address: fv.address || undefined,
            phone: fv.phone || undefined,
            email: fv.email || undefined,
            logoUrl: fv.logoUrl || undefined,
            domain: fv.domain || undefined
        };

        this.companyService.update(c.id, request).subscribe({
            next: () => {
                this.saving.set(false);
                this.editingProfile.set(false);
                this.loadCompany(c.id);
                this.showSuccess('Empresa actualizada correctamente');
            },
            error: (err: Error) => {
                this.saving.set(false);
                this.error.set(err.message);
            }
        });
    }

    toggleModule(mod: CompanyModuleResponse): void {
        const c = this.company();
        if (!c) return;
        this.companyService.toggleModule(c.id, mod.id, !mod.enabled).subscribe({
            next: () => this.loadModules(c.id),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    goBack(): void {
        this.router.navigate(['/admin/companies']);
    }

    // ── Private ─────────────────────────────────────────────────

    private loadCompany(id: number): void {
        this.loading.set(true);
        this.companyService.getById(id).subscribe({
            next: (company) => {
                this.company.set(company);
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    private loadModules(companyId: number): void {
        this.companyService.getCompanyModules(companyId).subscribe({
            next: (modules) => this.modules.set(modules),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    private loadUsers(companyId: number): void {
        this.companyService.getCompanyUsers(companyId).subscribe({
            next: (users) => this.users.set(users),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    private loadSubscription(companyId: number): void {
        this.companyService.getCompanySubscription(companyId).subscribe({
            next: (sub) => this.subscription.set(sub),
            error: (err: Error) => this.error.set(err.message)
        });
    }

    private showSuccess(msg: string): void {
        this.successMsg.set(msg);
        setTimeout(() => this.successMsg.set(null), 3000);
    }
}
