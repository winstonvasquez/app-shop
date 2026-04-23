import {
    Component,
    OnInit,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SolicitudCompraService } from '../../services/solicitud-compra.service';
import { AuthService } from '@core/auth/auth.service';
import { SolicitudCompra, SolicitudCompraItem } from '../../models/solicitud-compra.model';
import { ButtonComponent } from '@shared/components';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';

@Component({
    selector: 'app-solicitudes-compra',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        RouterModule,
        ButtonComponent,
        DrawerComponent,
        PageHeaderComponent,
        AlertComponent,
        LoadingSpinnerComponent,
        PaginationComponent,
    ],
    templateUrl: './solicitudes-compra.component.html',
})
export class SolicitudesCompraComponent implements OnInit {
    private readonly solicitudService = inject(SolicitudCompraService);
    private readonly authService = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    private readonly cdr = inject(ChangeDetectorRef);

    // Data
    solicitudes = signal<SolicitudCompra[]>([]);
    selectedSolicitud = signal<SolicitudCompra | null>(null);

    // UI state
    loading = signal(false);
    error = signal<string | null>(null);
    showForm = signal(false);
    showDetail = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);
    actionError = signal<string | null>(null);
    showRechazarModal = signal(false);
    showConvertirModal = signal(false);

    // Filters & pagination
    filterEstado = signal('');
    currentPage = signal(0);
    pageSize = signal(10);
    totalElements = signal(0);
    totalPages = signal(0);

    // Computed
    hasSolicitudes = computed(() => this.solicitudes().length > 0);
    isEmpty = computed(() => !this.loading() && !this.hasSolicitudes());

    breadcrumbs: Breadcrumb[] = [
        { label: 'Compras', url: '/compras' },
        { label: 'Solicitudes' },
    ];

    estadoOptions = [
        { value: 'BORRADOR', label: 'Borrador' },
        { value: 'PENDIENTE_APROBACION', label: 'Pendiente Aprobación' },
        { value: 'APROBADA', label: 'Aprobada' },
        { value: 'RECHAZADA', label: 'Rechazada' },
        { value: 'CONVERTIDA_OC', label: 'Convertida en OC' },
        { value: 'CANCELADA', label: 'Cancelada' },
    ];

    prioridadOptions = [
        { value: 'BAJA', label: 'Baja' },
        { value: 'NORMAL', label: 'Normal' },
        { value: 'ALTA', label: 'Alta' },
        { value: 'URGENTE', label: 'Urgente' },
    ];

    // Forms
    solicitudForm = this.fb.group({
        justificacion: ['', Validators.required],
        departamento: [''],
        prioridad: ['NORMAL'],
        fechaRequerida: [''],
        items: this.fb.array([this.createItemFormGroup()]),
    });

    rechazarForm = this.fb.group({
        motivoRechazo: ['', Validators.required],
    });

    convertirForm = this.fb.group({
        proveedorId: ['', Validators.required],
        condicionPago: ['CONTADO', Validators.required],
        almacenDestino: [''],
    });

    get itemsArray(): FormArray {
        return this.solicitudForm.get('items') as FormArray;
    }

    ngOnInit(): void {
        this.loadSolicitudes();
    }

    loadSolicitudes(): void {
        this.loading.set(true);
        this.error.set(null);
        this.solicitudService
            .getSolicitudes(this.currentPage(), this.pageSize(), this.filterEstado() || undefined)
            .subscribe({
                next: (page) => {
                    this.solicitudes.set(page.content);
                    this.totalElements.set(page.totalElements);
                    this.totalPages.set(page.totalPages);
                    this.loading.set(false);
                    this.cdr.markForCheck();
                },
                error: (err) => {
                    this.error.set('Error al cargar solicitudes de compra');
                    this.loading.set(false);
                    console.error(err);
                    this.cdr.markForCheck();
                },
            });
    }

    onFilterEstado(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.filterEstado.set(value);
        this.currentPage.set(0);
        this.loadSolicitudes();
    }

    onPageChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.loadSolicitudes();
    }

    openCreateForm(): void {
        this.solicitudForm.reset({ prioridad: 'NORMAL' });
        while (this.itemsArray.length > 0) this.itemsArray.removeAt(0);
        this.itemsArray.push(this.createItemFormGroup());
        this.submitError.set(null);
        this.showForm.set(true);
    }

    closeForm(): void {
        this.showForm.set(false);
    }

    openDetail(solicitud: SolicitudCompra): void {
        this.selectedSolicitud.set(solicitud);
        this.actionError.set(null);
        this.showDetail.set(true);
    }

    closeDetail(): void {
        this.showDetail.set(false);
        this.selectedSolicitud.set(null);
    }

    addItem(): void {
        this.itemsArray.push(this.createItemFormGroup());
    }

    removeItem(index: number): void {
        if (this.itemsArray.length > 1) {
            this.itemsArray.removeAt(index);
        }
    }

    createSolicitud(): void {
        if (this.solicitudForm.invalid) return;
        const user = this.authService.currentUser();
        if (!user) return;

        const formValue = this.solicitudForm.value;
        const items: SolicitudCompraItem[] = (formValue.items ?? []).map((i: Record<string, unknown>) => ({
            productoNombre: i['productoNombre'] as string,
            sku: i['sku'] as string | undefined,
            cantidad: Number(i['cantidad']),
            unidadMedida: (i['unidadMedida'] as string) || 'UNIDAD',
            precioEstimado: i['precioEstimado'] ? Number(i['precioEstimado']) : undefined,
            observaciones: i['observaciones'] as string | undefined,
        }));

        const payload: Partial<SolicitudCompra> = {
            solicitanteNombre: user.username,
            departamento: formValue.departamento ?? undefined,
            justificacion: formValue.justificacion ?? '',
            prioridad: formValue.prioridad ?? 'NORMAL',
            fechaRequerida: formValue.fechaRequerida ?? undefined,
            items,
        };

        this.submitting.set(true);
        this.submitError.set(null);
        this.solicitudService.createSolicitud(payload, String(user.userId), user.username).subscribe({
            next: () => {
                this.submitting.set(false);
                this.showForm.set(false);
                this.loadSolicitudes();
            },
            error: (err) => {
                this.submitError.set('Error al crear la solicitud');
                this.submitting.set(false);
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    enviarSolicitud(id: string): void {
        this.solicitudService.enviarSolicitud(id).subscribe({
            next: () => {
                this.closeDetail();
                this.loadSolicitudes();
            },
            error: (err) => {
                this.actionError.set('Error al enviar la solicitud');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    aprobarSolicitud(id: string): void {
        const user = this.authService.currentUser();
        if (!user) return;
        this.solicitudService.aprobarSolicitud(id, String(user.userId)).subscribe({
            next: () => {
                this.closeDetail();
                this.loadSolicitudes();
            },
            error: (err) => {
                this.actionError.set('Error al aprobar la solicitud');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    openRechazarModal(): void {
        this.rechazarForm.reset();
        this.showRechazarModal.set(true);
    }

    closeRechazarModal(): void {
        this.showRechazarModal.set(false);
    }

    confirmarRechazo(): void {
        if (this.rechazarForm.invalid) return;
        const solicitud = this.selectedSolicitud();
        if (!solicitud?.id) return;

        const motivo = this.rechazarForm.value.motivoRechazo ?? '';
        this.solicitudService.rechazarSolicitud(solicitud.id, motivo).subscribe({
            next: () => {
                this.showRechazarModal.set(false);
                this.closeDetail();
                this.loadSolicitudes();
            },
            error: (err) => {
                this.actionError.set('Error al rechazar la solicitud');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    openConvertirModal(): void {
        this.convertirForm.reset({ condicionPago: 'CONTADO' });
        this.showConvertirModal.set(true);
    }

    closeConvertirModal(): void {
        this.showConvertirModal.set(false);
    }

    confirmarConversion(): void {
        if (this.convertirForm.invalid) return;
        const solicitud = this.selectedSolicitud();
        if (!solicitud?.id) return;

        const { proveedorId, condicionPago, almacenDestino } = this.convertirForm.value;
        this.solicitudService
            .convertirAOrdenCompra(
                solicitud.id,
                proveedorId ?? '',
                condicionPago ?? '',
                almacenDestino ?? undefined
            )
            .subscribe({
                next: () => {
                    this.showConvertirModal.set(false);
                    this.closeDetail();
                    this.loadSolicitudes();
                },
                error: (err) => {
                    this.actionError.set('Error al convertir la solicitud en OC');
                    console.error(err);
                    this.cdr.markForCheck();
                },
            });
    }

    cancelarSolicitud(id: string): void {
        if (!confirm('¿Está seguro de cancelar esta solicitud?')) return;
        this.solicitudService.cancelarSolicitud(id).subscribe({
            next: () => {
                this.closeDetail();
                this.loadSolicitudes();
            },
            error: (err) => {
                this.actionError.set('Error al cancelar la solicitud');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    getBadgeClass(estado: string | undefined): string {
        switch (estado) {
            case 'BORRADOR':
                return 'badge badge-neutral';
            case 'PENDIENTE_APROBACION':
                return 'badge badge-warning';
            case 'APROBADA':
                return 'badge badge-success';
            case 'RECHAZADA':
                return 'badge badge-error';
            case 'CONVERTIDA_OC':
                return 'badge badge-accent';
            case 'CANCELADA':
                return 'badge badge-neutral';
            default:
                return 'badge badge-neutral';
        }
    }

    getEstadoLabel(estado: string | undefined): string {
        return this.estadoOptions.find((o) => o.value === estado)?.label ?? (estado ?? '—');
    }

    private createItemFormGroup(): FormGroup {
        return this.fb.group({
            productoNombre: ['', Validators.required],
            sku: [''],
            cantidad: [1, [Validators.required, Validators.min(1)]],
            unidadMedida: ['UNIDAD'],
            precioEstimado: [null],
            observaciones: [''],
        });
    }
}
