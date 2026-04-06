import {
    Component, OnInit, ChangeDetectionStrategy, inject, signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
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
    imports: [PageHeaderComponent, RouterLink, ReactiveFormsModule],
    templateUrl: './customer-detail.component.html',
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

    // Formulario dirección inline
    dirForm = this.fb.group({
        tipoDireccion: ['ENVIO', Validators.required],
        departamento: ['', Validators.required],
        provincia: ['', Validators.required],
        distrito: ['', Validators.required],
        direccion: ['', Validators.required],
        referencia: [''],
        ubigeo: [''],
        esPrincipal: [false],
    });
    showDirForm = signal(false);

    // Formulario contacto inline
    ctForm = this.fb.group({
        nombreCompleto: ['', Validators.required],
        cargo: [''],
        email: ['', Validators.email],
        telefono: [''],
        esPrincipal: [false],
    });
    showCtForm = signal(false);

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

    setTab(tab: 'general' | 'direcciones' | 'contactos'): void {
        this.activeTab.set(tab);
    }

    saveDireccion(): void {
        if (this.dirForm.invalid) return;
        const id = this.customer()!.id;
        const dto = this.dirForm.value as CustomerDireccionRequest;
        this.customerService.addDireccion(id, dto).subscribe({
            next: () => {
                this.showDirForm.set(false);
                this.dirForm.reset({ tipoDireccion: 'ENVIO', esPrincipal: false });
                this.loadDirecciones(id);
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

    saveContacto(): void {
        if (this.ctForm.invalid) return;
        const id = this.customer()!.id;
        const dto = this.ctForm.value as CustomerContactoRequest;
        this.customerService.addContacto(id, dto).subscribe({
            next: () => {
                this.showCtForm.set(false);
                this.ctForm.reset({ esPrincipal: false });
                this.loadContactos(id);
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
