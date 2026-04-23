import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { TransportistaService } from '../../services/transportista.service';
import { Transportista } from '../../models/transportista.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { ButtonComponent } from '@shared/components';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';

@Component({
    selector: 'app-transportistas-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        ButtonComponent,
        DataTableComponent,
        DrawerComponent,
        AlertComponent,
        PageHeaderComponent
    ],
    templateUrl: './transportistas-page.component.html'
})
export class TransportistasPageComponent implements OnInit {
    private readonly service   = inject(TransportistaService);
    private readonly authService = inject(AuthService);
    private readonly fb        = inject(FormBuilder);

    // Data
    items    = signal<Transportista[]>([]);
    selected = signal<Transportista | null>(null);

    // UI state
    loading     = signal(false);
    error       = signal<string | null>(null);
    showForm    = signal(false);
    editMode    = signal(false);
    submitting  = signal(false);
    submitError = signal<string | null>(null);

    // Pagination
    currentPage   = signal(0);
    pageSize      = signal(10);
    totalElements = signal(0);
    totalPages    = signal(0);

    readonly serviceTypeOptions = [
        { value: 'NACIONAL',       label: 'Nacional' },
        { value: 'INTERNACIONAL',  label: 'Internacional' },
        { value: 'EXPRES',         label: 'Express' },
        { value: 'ECONOMICO',      label: 'Económico' },
        { value: 'PROPIO',         label: 'Flota propia' }
    ];

    breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Transportistas' }
    ];

    columns: TableColumn<Transportista>[] = [
        { key: 'code',        label: 'Código',   width: '100px' },
        { key: 'name',        label: 'Nombre' },
        { key: 'serviceType', label: 'Tipo Servicio',
          render: (r) => this.serviceTypeOptions.find(o => o.value === r.serviceType)?.label ?? r.serviceType },
        { key: 'contactPhone', label: 'Teléfono', render: (r) => r.contactPhone || '—' },
        { key: 'contactEmail', label: 'Email',    render: (r) => r.contactEmail || '—' },
        { key: 'active', label: 'Estado', html: true,
          render: (r) => r.active
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-neutral">Inactivo</span>' }
    ];

    actions: TableAction<Transportista>[] = [
        {
            label: 'Editar', icon: '✏️', class: 'btn-view',
            onClick: (row) => this.openEditForm(row)
        },
        {
            label: 'Desactivar', icon: '✕', class: 'btn-view',
            show: (row) => row.active,
            onClick: (row) => this.toggleActivo(row, false)
        },
        {
            label: 'Activar', icon: '✓', class: 'btn-view',
            show: (row) => !row.active,
            onClick: (row) => this.toggleActivo(row, true)
        }
    ];

    form: FormGroup;

    constructor() {
        this.form = this.fb.group({
            code:         ['', [Validators.required, Validators.maxLength(50)]],
            name:         ['', [Validators.required, Validators.maxLength(100)]],
            serviceType:  ['NACIONAL', Validators.required],
            contactPhone: [''],
            contactEmail: ['', Validators.email],
            apiUrl:       [''],
            active:       [true]
        });
    }

    private get companyId(): string {
        return String(this.authService.currentUser()?.activeCompanyId ?? 1);
    }

    ngOnInit() {
        this.loadItems();
    }

    loadItems() {
        this.loading.set(true);
        this.error.set(null);
        this.service.getTransportistas(this.companyId, this.currentPage(), this.pageSize()).subscribe({
            next: (res) => {
                this.items.set(res.content);
                this.totalElements.set(res.totalElements);
                this.totalPages.set(res.totalPages);
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message ?? 'Error al cargar transportistas.');
                this.loading.set(false);
            }
        });
    }

    onPaginationChange(event: PaginationChangeEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadItems();
    }

    openCreateForm() {
        this.editMode.set(false);
        this.selected.set(null);
        this.form.reset({ serviceType: 'NACIONAL', active: true });
        this.submitError.set(null);
        this.showForm.set(true);
    }

    openEditForm(item: Transportista) {
        this.editMode.set(true);
        this.selected.set(item);
        this.form.patchValue({
            code:         item.code,
            name:         item.name,
            serviceType:  item.serviceType,
            contactPhone: item.contactPhone ?? '',
            contactEmail: item.contactEmail ?? '',
            apiUrl:       item.apiUrl ?? '',
            active:       item.active
        });
        this.submitError.set(null);
        this.showForm.set(true);
    }

    closeForm() {
        this.showForm.set(false);
        this.form.reset();
    }

    onSubmit() {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }

        this.submitting.set(true);
        this.submitError.set(null);

        const payload = {
            ...this.form.value,
            tenantId:  this.companyId,
            companyId: this.companyId
        };

        const op = this.editMode()
            ? this.service.update(this.selected()!.id, payload)
            : this.service.create(payload);

        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeForm();
                this.loadItems();
            },
            error: (err: Error) => {
                this.submitError.set(err.message ?? 'Error al guardar transportista.');
                this.submitting.set(false);
            }
        });
    }

    toggleActivo(item: Transportista, active: boolean) {
        this.service.toggleActivo(item.id, active, this.companyId).subscribe({
            next: () => this.loadItems(),
            error: (err: Error) => this.error.set(err.message)
        });
    }
}
