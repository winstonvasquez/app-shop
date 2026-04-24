import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { AlmacenService } from '../../../services/almacen.service';
import { Almacen, CreateAlmacenDto } from '../../../models/almacen.model';
import { AuthService } from '../../../../../core/auth/auth.service';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { ButtonComponent } from '@shared/components';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';

@Component({
    selector: 'app-almacenes-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        DataTableComponent,
        DrawerComponent,
        AlertComponent,
        PageHeaderComponent,
        ButtonComponent
    ],
    templateUrl: './almacenes-page.component.html'
})
export class AlmacenesPageComponent implements OnInit {
    private readonly almacenService = inject(AlmacenService);
    private readonly authService    = inject(AuthService);
    private readonly fb             = inject(FormBuilder);

    // Data
    almacenes = signal<Almacen[]>([]);
    selected  = signal<Almacen | null>(null);

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

    breadcrumbs: Breadcrumb[] = [
        { label: 'Inicio',    url: '/admin/dashboard' },
        { label: 'Logística', url: '/logistica/dashboard' },
        { label: 'Almacenes' }
    ];

    columns: TableColumn<Almacen>[] = [
        { key: 'codigo',     label: 'Código',      width: '100px' },
        { key: 'nombre',     label: 'Nombre' },
        { key: 'direccion',  label: 'Dirección',   render: (r) => r.direccion || '—' },
        { key: 'telefono',   label: 'Teléfono',    render: (r) => r.telefono  || '—' },
        { key: 'totalItems', label: 'Items',       align: 'right',
          render: (r) => `${r.totalItems ?? 0}` },
        { key: 'estado', label: 'Estado', html: true,
          render: (r) => r.estado === 'ACTIVO'
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-neutral">Inactivo</span>' }
    ];

    actions: TableAction<Almacen>[] = [
        {
            label: 'Editar', icon: '✏️', class: 'btn-view',
            onClick: (row) => this.openEditForm(row)
        }
    ];

    form: FormGroup = this.fb.group({
        codigo:    ['', Validators.required],
        nombre:    ['', Validators.required],
        direccion: [''],
        telefono:  ['']
    });

    private get companyId(): string {
        return String(this.authService.currentUser()?.activeCompanyId ?? 1);
    }

    ngOnInit() {
        this.loadAlmacenes();
    }

    loadAlmacenes() {
        this.loading.set(true);
        this.error.set(null);
        this.almacenService.getAlmacenes(this.companyId, {
            page: this.currentPage(),
            size: this.pageSize()
        }).subscribe({
            next: (res) => {
                this.almacenes.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message ?? 'Error al cargar almacenes.');
                this.loading.set(false);
            }
        });
    }

    onPaginationChange(event: PaginationChangeEvent) {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadAlmacenes();
    }

    openCreateForm() {
        this.editMode.set(false);
        this.selected.set(null);
        this.form.reset();
        this.submitError.set(null);
        this.showForm.set(true);
    }

    openEditForm(almacen: Almacen) {
        this.editMode.set(true);
        this.selected.set(almacen);
        this.form.patchValue({
            codigo:    almacen.codigo,
            nombre:    almacen.nombre,
            direccion: almacen.direccion ?? '',
            telefono:  almacen.telefono  ?? ''
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

        const dto: CreateAlmacenDto = this.form.value;
        const op = this.editMode()
            ? this.almacenService.updateAlmacen(this.selected()!.id, dto, this.companyId)
            : this.almacenService.createAlmacen(dto, this.companyId);

        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeForm();
                this.loadAlmacenes();
            },
            error: (err: Error) => {
                this.submitError.set(err.message ?? 'Error al guardar almacén.');
                this.submitting.set(false);
            }
        });
    }
}
