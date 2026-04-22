import {
    Component, OnInit, ChangeDetectionStrategy, inject, signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { AdminFormSectionComponent } from '@shared/ui/forms/admin-form-section/admin-form-section.component';
import { AdminFormLayoutComponent } from '@shared/ui/forms/admin-form-layout/admin-form-layout.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { CustomerService } from '@features/admin/services/customer.service';
import {
    CustomerResponse,
    CustomerDireccionResponse,
    CustomerContactoResponse,
    CustomerDireccionRequest,
    CustomerContactoRequest,
    TIPO_DIRECCION_OPTIONS,
} from '@features/admin/models/customer.model';

@Component({
    selector: 'app-customer-detail',
    standalone: true,
    imports: [
        PageHeaderComponent,
        RouterLink,
        ReactiveFormsModule,
        FormFieldComponent,
        AdminFormSectionComponent,
        AdminFormLayoutComponent,
        DataTableComponent,
    ],
    templateUrl: './customer-detail.component.html',
    styleUrl: './customer-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly customerService = inject(CustomerService);
    private readonly fb = inject(FormBuilder);

    customer = signal<CustomerResponse | null>(null);
    direcciones = signal<CustomerDireccionResponse[]>([]);
    contactos = signal<CustomerContactoResponse[]>([]);
    loading = signal(true);
    activeTab = signal<'general' | 'direcciones' | 'contactos'>('general');

    tipoDireccionOptions = TIPO_DIRECCION_OPTIONS;

    breadcrumbs = [
        { label: 'Admin', url: '/admin' },
        { label: 'Clientes', url: '/admin/customers' },
        { label: 'Detalle' },
    ];

    // ── Formulario dirección inline ─────────────────────────────────────────
    dirForm = this.fb.group({
        tipoDireccion: ['ENVIO', Validators.required],
        departamento:  ['', Validators.required],
        provincia:     ['', Validators.required],
        distrito:      ['', Validators.required],
        direccion:     ['', Validators.required],
        referencia:    [''],
        ubigeo:        [''],
        esPrincipal:   [false],
    });
    showDirForm  = signal(false);
    dirSaving    = signal(false);
    dirSaveError = signal('');

    // ── Formulario contacto inline ──────────────────────────────────────────
    ctForm = this.fb.group({
        nombreCompleto: ['', Validators.required],
        cargo:          [''],
        email:          ['', Validators.email],
        telefono:       [''],
        esPrincipal:    [false],
    });
    showCtForm   = signal(false);
    ctSaving     = signal(false);
    ctSaveError  = signal('');

    // ── Columnas data-table ─────────────────────────────────────────────────
    readonly dirColumns: TableColumn<CustomerDireccionResponse>[] = [
        {
            key: 'tipoDireccion',
            label: 'Tipo',
            render: (r) => `<span class="badge badge-neutral">${r.tipoDireccion}</span>`,
            html: true,
        },
        {
            key: 'ubicacion',
            label: 'Ubicación',
            render: (r) => `${r.departamento} / ${r.provincia} / ${r.distrito}`,
        },
        { key: 'direccion', label: 'Dirección' },
        {
            key: 'esPrincipal',
            label: 'Principal',
            render: (r) => r.esPrincipal ? '<span class="badge badge-success">Sí</span>' : '',
            html: true,
        },
    ];

    readonly dirActions: TableAction<CustomerDireccionResponse>[] = [
        {
            label: 'Eliminar',
            icon: 'delete',
            class: 'btn-icon-delete',
            onClick: (row) => this.deleteDireccion(row.id),
        },
    ];

    readonly ctColumns: TableColumn<CustomerContactoResponse>[] = [
        { key: 'nombreCompleto', label: 'Nombre' },
        {
            key: 'cargo',
            label: 'Cargo',
            render: (r) => r.cargo ?? '-',
        },
        {
            key: 'email',
            label: 'Email',
            render: (r) => r.email ?? '-',
        },
        {
            key: 'telefono',
            label: 'Teléfono',
            render: (r) => r.telefono ?? '-',
        },
        {
            key: 'esPrincipal',
            label: 'Principal',
            render: (r) => r.esPrincipal ? '<span class="badge badge-success">Sí</span>' : '',
            html: true,
        },
    ];

    readonly ctActions: TableAction<CustomerContactoResponse>[] = [
        {
            label: 'Eliminar',
            icon: 'delete',
            class: 'btn-icon-delete',
            onClick: (row) => this.deleteContacto(row.id),
        },
    ];

    // ── Lifecycle ───────────────────────────────────────────────────────────
    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (id) {
            this.loadCustomer(id);
        } else {
            this.loading.set(false);
        }
    }

    private loadCustomer(id: number): void {
        this.loading.set(true);
        this.customerService.getById(id).subscribe({
            next: (c) => {
                this.customer.set(c);
                this.loading.set(false);
                this.loadDirecciones(id);
                if (c.tipoCliente === 'PERSONA_JURIDICA') {
                    this.loadContactos(id);
                }
            },
            error: () => this.loading.set(false),
        });
    }

    private loadDirecciones(clienteId: number): void {
        this.customerService.getDirecciones(clienteId).subscribe({
            next: (dirs) => this.direcciones.set(dirs),
        });
    }

    private loadContactos(clienteId: number): void {
        this.customerService.getContactos(clienteId).subscribe({
            next: (cts) => this.contactos.set(cts),
        });
    }

    // ── Tabs ────────────────────────────────────────────────────────────────
    setTab(tab: 'general' | 'direcciones' | 'contactos'): void {
        this.activeTab.set(tab);
    }

    // ── Error helpers ───────────────────────────────────────────────────────
    errDir(field: string): string {
        const c = this.dirForm.get(field);
        if (!c || c.pristine || c.valid) return '';
        if (c.hasError('required')) return 'Campo requerido';
        return 'Campo inválido';
    }

    errCt(field: string): string {
        const c = this.ctForm.get(field);
        if (!c || c.pristine || c.valid) return '';
        if (c.hasError('required')) return 'Campo requerido';
        if (c.hasError('email')) return 'Email inválido';
        return 'Campo inválido';
    }

    // ── CRUD direcciones ────────────────────────────────────────────────────
    openDirForm(): void {
        this.dirSaveError.set('');
        this.showDirForm.set(true);
    }

    cancelDirForm(): void {
        this.showDirForm.set(false);
        this.dirForm.reset({ tipoDireccion: 'ENVIO', esPrincipal: false });
        this.dirSaveError.set('');
    }

    saveDireccion(): void {
        if (this.dirForm.invalid) {
            this.dirForm.markAllAsTouched();
            return;
        }
        const id = this.customer()!.id;
        const dto = this.dirForm.value as CustomerDireccionRequest;
        this.dirSaving.set(true);
        this.dirSaveError.set('');
        this.customerService.addDireccion(id, dto).subscribe({
            next: () => {
                this.dirSaving.set(false);
                this.cancelDirForm();
                this.loadDirecciones(id);
            },
            error: () => {
                this.dirSaving.set(false);
                this.dirSaveError.set('Error al guardar la dirección. Intenta de nuevo.');
            },
        });
    }

    deleteDireccion(dirId: number): void {
        if (!confirm('¿Desactivar esta dirección?')) return;
        const id = this.customer()!.id;
        this.customerService.deactivateDireccion(id, dirId).subscribe({
            next: () => this.loadDirecciones(id),
        });
    }

    // ── CRUD contactos ──────────────────────────────────────────────────────
    openCtForm(): void {
        this.ctSaveError.set('');
        this.showCtForm.set(true);
    }

    cancelCtForm(): void {
        this.showCtForm.set(false);
        this.ctForm.reset({ esPrincipal: false });
        this.ctSaveError.set('');
    }

    saveContacto(): void {
        if (this.ctForm.invalid) {
            this.ctForm.markAllAsTouched();
            return;
        }
        const id = this.customer()!.id;
        const dto = this.ctForm.value as CustomerContactoRequest;
        this.ctSaving.set(true);
        this.ctSaveError.set('');
        this.customerService.addContacto(id, dto).subscribe({
            next: () => {
                this.ctSaving.set(false);
                this.cancelCtForm();
                this.loadContactos(id);
            },
            error: () => {
                this.ctSaving.set(false);
                this.ctSaveError.set('Error al guardar el contacto. Intenta de nuevo.');
            },
        });
    }

    deleteContacto(ctId: number): void {
        if (!confirm('¿Desactivar este contacto?')) return;
        const id = this.customer()!.id;
        this.customerService.deactivateContacto(id, ctId).subscribe({
            next: () => this.loadContactos(id),
        });
    }
}
