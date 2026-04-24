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
import { TranslatePipe } from '@ngx-translate/core';
import { DevolucionService } from '../../services/devolucion.service';
import { CrearDevolucionRequest, Devolucion } from '../../models/devolucion.model';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-devoluciones',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        RouterModule,
        DrawerComponent,
        PageHeaderComponent,
        AlertComponent,
        LoadingSpinnerComponent,
        PaginationComponent,
        ButtonComponent,
    ],
    templateUrl: './devoluciones.component.html',
})
export class DevolucionesComponent implements OnInit {
    private readonly devolucionService = inject(DevolucionService);
    private readonly fb = inject(FormBuilder);
    private readonly cdr = inject(ChangeDetectorRef);

    devoluciones = signal<Devolucion[]>([]);
    selected = signal<Devolucion | null>(null);

    loading = signal(false);
    error = signal<string | null>(null);
    showForm = signal(false);
    showDetail = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);
    actionError = signal<string | null>(null);

    filterEstado = signal('');
    currentPage = signal(0);
    pageSize = signal(10);
    totalElements = signal(0);
    totalPages = signal(0);

    hasItems = computed(() => this.devoluciones().length > 0);
    isEmpty = computed(() => !this.loading() && !this.hasItems());

    breadcrumbs: Breadcrumb[] = [
        { label: 'Compras', url: '/compras' },
        { label: 'Devoluciones' },
    ];

    estadoOptions = [
        { value: 'BORRADOR', label: 'Borrador' },
        { value: 'ENVIADA', label: 'Enviada' },
        { value: 'ACEPTADA', label: 'Aceptada' },
        { value: 'RECHAZADA', label: 'Rechazada' },
        { value: 'COMPLETADA', label: 'Completada' },
    ];

    motivoOptions = [
        { value: 'PRODUCTO_DEFECTUOSO', label: 'Producto Defectuoso' },
        { value: 'CANTIDAD_INCORRECTA', label: 'Cantidad Incorrecta' },
        { value: 'PRECIO_INCORRECTO', label: 'Precio Incorrecto' },
        { value: 'ENTREGA_TARDIA', label: 'Entrega Tardía' },
        { value: 'OTRO', label: 'Otro' },
    ];

    devolucionForm = this.fb.group({
        ordenCompraId: ['', Validators.required],
        recepcionId: [''],
        motivo: ['PRODUCTO_DEFECTUOSO', Validators.required],
        tipo: ['DEVOLUCION'],
        observaciones: [''],
        items: this.fb.array([this.createItemGroup()]),
    });

    get itemsArray(): FormArray { return this.devolucionForm.get('items') as FormArray; }

    ngOnInit(): void { this.loadDevoluciones(); }

    loadDevoluciones(): void {
        this.loading.set(true);
        this.error.set(null);
        this.devolucionService.listar(this.currentPage(), this.pageSize(), this.filterEstado() || undefined).subscribe({
            next: (page) => {
                this.devoluciones.set(page.content);
                this.totalElements.set(page.totalElements);
                this.totalPages.set(page.totalPages);
                this.loading.set(false);
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.error.set('Error al cargar devoluciones');
                this.loading.set(false);
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    onFilterEstado(event: Event): void {
        this.filterEstado.set((event.target as HTMLSelectElement).value);
        this.currentPage.set(0);
        this.loadDevoluciones();
    }

    onPageChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.loadDevoluciones();
    }

    openCreateForm(): void {
        this.devolucionForm.reset({ motivo: 'PRODUCTO_DEFECTUOSO', tipo: 'DEVOLUCION' });
        while (this.itemsArray.length > 0) this.itemsArray.removeAt(0);
        this.itemsArray.push(this.createItemGroup());
        this.submitError.set(null);
        this.showForm.set(true);
    }

    closeForm(): void { this.showForm.set(false); }

    openDetail(dev: Devolucion): void {
        this.selected.set(dev);
        this.actionError.set(null);
        this.showDetail.set(true);
    }

    closeDetail(): void { this.showDetail.set(false); this.selected.set(null); }

    addItem(): void { this.itemsArray.push(this.createItemGroup()); }

    removeItem(i: number): void { if (this.itemsArray.length > 1) this.itemsArray.removeAt(i); }

    crearDevolucion(): void {
        if (this.devolucionForm.invalid) return;
        const fv = this.devolucionForm.value;

        const request: CrearDevolucionRequest = {
            ordenCompraId: fv.ordenCompraId ?? '',
            recepcionId: fv.recepcionId || undefined,
            motivo: fv.motivo ?? '',
            tipo: fv.tipo ?? 'DEVOLUCION',
            observaciones: fv.observaciones || undefined,
            items: (fv.items ?? []).map((i: Record<string, unknown>) => ({
                ordenItemId: (i['ordenItemId'] as string) || undefined,
                productoNombre: i['productoNombre'] as string,
                sku: (i['sku'] as string) || undefined,
                cantidad: Number(i['cantidad']),
                motivoItem: (i['motivoItem'] as string) || undefined,
            })),
        };

        this.submitting.set(true);
        this.submitError.set(null);
        this.devolucionService.crear(request).subscribe({
            next: () => {
                this.submitting.set(false);
                this.showForm.set(false);
                this.loadDevoluciones();
            },
            error: (err) => {
                this.submitError.set('Error al crear devolución');
                this.submitting.set(false);
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    cambiarEstado(action: 'enviar' | 'aceptar' | 'completar'): void {
        const dev = this.selected();
        if (!dev?.id) return;
        const obs = action === 'enviar' ? this.devolucionService.enviar(dev.id)
            : action === 'aceptar' ? this.devolucionService.aceptar(dev.id)
            : this.devolucionService.completar(dev.id);

        obs.subscribe({
            next: () => { this.closeDetail(); this.loadDevoluciones(); },
            error: (err) => {
                this.actionError.set('Error al cambiar estado');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    getBadge(estado: string | undefined): string {
        switch (estado) {
            case 'BORRADOR': return 'badge badge-neutral';
            case 'ENVIADA': return 'badge badge-accent';
            case 'ACEPTADA': return 'badge badge-warning';
            case 'COMPLETADA': return 'badge badge-success';
            case 'RECHAZADA': return 'badge badge-error';
            default: return 'badge badge-neutral';
        }
    }

    getEstadoLabel(estado: string | undefined): string {
        return this.estadoOptions.find(o => o.value === estado)?.label ?? (estado ?? '—');
    }

    getMotivoLabel(motivo: string | undefined): string {
        return this.motivoOptions.find(o => o.value === motivo)?.label ?? (motivo ?? '—');
    }

    private createItemGroup(): FormGroup {
        return this.fb.group({
            ordenItemId: [''],
            productoNombre: ['', Validators.required],
            sku: [''],
            cantidad: [1, [Validators.required, Validators.min(1)]],
            motivoItem: [''],
        });
    }
}
