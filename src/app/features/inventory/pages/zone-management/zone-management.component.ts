import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { WmsApiService } from '../../services/wms-api.service';
import { WarehouseZone, ZoneLocation } from '../../models/wms-zone.models';
import { AlmacenService } from '@features/logistica/services/almacen.service';
import { almacenSelectSource } from '@features/logistica/components/select-sources';
import type { ServerSelectId } from '@shared/components';
import { AuthService } from '@core/auth/auth.service';
import { pageTotalElements, pageTotalPages } from '@core/models/pagination.model';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent } from '@shared/components';
import { ROUTES } from '@shared/constants/app.constants';

@Component({
    selector: 'app-zone-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule, FormsModule,
        DataTableComponent, DrawerComponent, ModalComponent,
        PageHeaderComponent, AlertComponent, FormFieldComponent,
        ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent
    ],
    templateUrl: './zone-management.component.html',
    styleUrl: './zone-management.component.scss'
})
export class ZoneManagementComponent {
    private readonly api = inject(WmsApiService);
    private readonly almacenApi = inject(AlmacenService);
    private readonly authService = inject(AuthService);
    private readonly fb = inject(FormBuilder);

    readonly almacenSource = almacenSelectSource(this.almacenApi, () => this.authService.currentUser()?.activeCompanyId);

    selectedAlmacenId = signal<string | null>(null);
    zones = signal<WarehouseZone[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(20);
    totalElements = signal(0);
    totalPages = signal(0);

    showDrawer = signal(false);
    editMode = signal(false);
    selectedId = signal<string | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    showConfirmDelete = signal(false);
    pendingDeleteId = signal<string | null>(null);

    breadcrumbs: Breadcrumb[] = [
        { label: 'Admin', url: ROUTES.admin },
        { label: 'Inventario', url: '/admin/inventario/dashboard' },
        { label: 'Zonas' }
    ];

    columns: TableColumn<WarehouseZone>[] = [
        { key: 'codigo', label: 'Código', sortable: true, width: '110px' },
        { key: 'nombre', label: 'Nombre', sortable: true },
        { key: 'tipo', label: 'Tipo', render: (r) => r.tipo },
        { key: 'temperatura', label: 'Temperatura', render: (r) => r.temperatura },
        { key: 'capacidadMaxima', label: 'Capacidad', align: 'right',
          render: (r) => `${r.ocupacionActual}/${r.capacidadMaxima}` },
        { key: 'ordenPicking', label: 'Orden Picking', align: 'right' }
    ];

    actions: TableAction<WarehouseZone>[] = [
        { label: 'Ver ubicaciones', class: 'btn btn-secondary', onClick: (r) => this.openLocations(r) },
        { label: 'Editar', icon: 'edit', class: 'btn-icon-edit', onClick: (r) => this.openEdit(r) },
        { label: 'Eliminar', icon: 'trash', class: 'btn-icon-delete', onClick: (r) => this.confirmDelete(r.id) }
    ];

    // ── Ubicaciones dentro de la zona (drawer anidado) ──────────────────
    showLocationsDrawer = signal(false);
    locationsTarget = signal<WarehouseZone | null>(null);
    zoneLocations = signal<ZoneLocation[]>([]);
    locationsLoading = signal(false);
    locationsError = signal<string | null>(null);
    locationSubmitting = signal(false);

    locationColumns: TableColumn<ZoneLocation>[] = [
        { key: 'codigo', label: 'Código', width: '110px' },
        { key: 'pasillo', label: 'Pasillo', render: (r) => r.pasillo ?? '—' },
        { key: 'estante', label: 'Estante', render: (r) => r.estante ?? '—' },
        { key: 'nivel', label: 'Nivel', render: (r) => r.nivel ?? '—' },
        { key: 'posicion', label: 'Posición', render: (r) => r.posicion ?? '—' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'capacidadMaxima', label: 'Capacidad', align: 'right',
          render: (r) => `${r.ocupacionActual}/${r.capacidadMaxima}` }
    ];

    locationActions: TableAction<ZoneLocation>[] = [
        { label: 'Eliminar', icon: 'trash', class: 'btn-icon-delete', onClick: (r) => this.deleteLocation(r.id) }
    ];

    locationForm: FormGroup = this.fb.nonNullable.group({
        codigo: ['', Validators.required],
        pasillo: [''],
        estante: [''],
        nivel: [''],
        posicion: [''],
        tipo: ['STORAGE'],
        capacidadMaxima: [0]
    });

    openLocations(zone: WarehouseZone): void {
        this.locationsTarget.set(zone);
        this.locationForm.reset({ tipo: 'STORAGE', capacidadMaxima: 0 });
        this.locationsError.set(null);
        this.showLocationsDrawer.set(true);
        this.loadZoneLocations();
    }

    closeLocationsDrawer(): void {
        this.showLocationsDrawer.set(false);
        this.locationsTarget.set(null);
    }

    loadZoneLocations(): void {
        const zone = this.locationsTarget();
        if (!zone) return;
        this.locationsLoading.set(true);
        this.api.getZoneLocations(zone.id, 0, 100).subscribe({
            next: (res) => { this.zoneLocations.set(res.content); this.locationsLoading.set(false); },
            error: (err: Error) => { this.locationsError.set(err.message); this.locationsLoading.set(false); }
        });
    }

    submitLocation(): void {
        const zone = this.locationsTarget();
        if (!zone || this.locationForm.invalid) { this.locationForm.markAllAsTouched(); return; }
        this.locationSubmitting.set(true);
        const v = this.locationForm.getRawValue();
        this.api.createZoneLocation({ ...v, zoneId: zone.id }).subscribe({
            next: () => {
                this.locationSubmitting.set(false);
                this.locationForm.reset({ tipo: 'STORAGE', capacidadMaxima: 0 });
                this.loadZoneLocations();
            },
            error: (err: Error) => { this.locationSubmitting.set(false); this.locationsError.set(err.message); }
        });
    }

    deleteLocation(id: string): void {
        this.api.deleteZoneLocation(id).subscribe({
            next: () => this.loadZoneLocations(),
            error: (err: Error) => this.locationsError.set(err.message)
        });
    }

    form: FormGroup = this.fb.nonNullable.group({
        almacenId: [null as string | null, Validators.required],
        nombre: ['', [Validators.required, Validators.maxLength(100)]],
        codigo: ['', [Validators.required, Validators.maxLength(20)]],
        tipo: ['', Validators.required],
        temperatura: ['AMBIENTE'],
        descripcion: [''],
        capacidadMaxima: [0],
        ordenPicking: [0]
    });

    onAlmacenSelected(id: ServerSelectId | null): void {
        this.selectedAlmacenId.set(id != null ? String(id) : null);
        this.currentPage.set(0);
        this.loadZones();
    }

    loadZones(): void {
        const almacenId = this.selectedAlmacenId();
        if (!almacenId) { this.zones.set([]); this.totalElements.set(0); this.totalPages.set(0); return; }
        this.loading.set(true);
        this.api.getZones(almacenId, this.currentPage(), this.pageSize()).subscribe({
            next: (res) => {
                this.zones.set(res.content);
                this.totalElements.set(pageTotalElements(res));
                this.totalPages.set(pageTotalPages(res));
                this.loading.set(false);
            },
            error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
        });
    }

    openCreate(): void {
        this.editMode.set(false);
        this.selectedId.set(null);
        this.form.reset({ almacenId: this.selectedAlmacenId(), temperatura: 'AMBIENTE', capacidadMaxima: 0, ordenPicking: 0 });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    openEdit(zone: WarehouseZone): void {
        this.editMode.set(true);
        this.selectedId.set(zone.id);
        this.form.patchValue({ ...zone });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void { this.showDrawer.set(false); }

    onSubmit(): void {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        const v = this.form.getRawValue();
        const payload = { ...v, almacenId: v.almacenId! };
        const op = this.editMode()
            ? this.api.updateZone(this.selectedId()!, payload)
            : this.api.createZone(payload);
        op.subscribe({
            next: () => { this.submitting.set(false); this.closeDrawer(); this.loadZones(); },
            error: (err: Error) => { this.submitting.set(false); this.submitError.set(err.message); }
        });
    }

    confirmDelete(id: string): void {
        this.pendingDeleteId.set(id);
        this.showConfirmDelete.set(true);
    }

    cancelDelete(): void {
        this.pendingDeleteId.set(null);
        this.showConfirmDelete.set(false);
    }

    executeDelete(): void {
        const id = this.pendingDeleteId();
        if (id === null) return;
        this.showConfirmDelete.set(false);
        this.api.deleteZone(id).subscribe({
            next: () => { this.pendingDeleteId.set(null); this.loadZones(); },
            error: (err: Error) => { this.pendingDeleteId.set(null); this.error.set(err.message); }
        });
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
        this.loadZones();
    }

    getCtrl(name: string): FormControl {
        return this.form.get(name) as FormControl;
    }

    getLocationCtrl(name: string): FormControl {
        return this.locationForm.get(name) as FormControl;
    }
}
