import {
    Component,
    OnInit,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SolicitudCompraService } from '../../services/solicitud-compra.service';
import { AuthService } from '@core/auth/auth.service';
import { SolicitudCompra } from '../../models/solicitud-compra.model';
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { LoadingSpinnerComponent } from '@shared/ui/feedback/loading-spinner/loading-spinner.component';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';

@Component({
    selector: 'app-mis-solicitudes',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterModule,
        TranslatePipe,
        PageHeaderComponent,
        AlertComponent,
        LoadingSpinnerComponent,
        PaginationComponent,
    ],
    templateUrl: './mis-solicitudes.component.html',
})
export class MisSolicitudesComponent implements OnInit {
    private readonly solicitudService = inject(SolicitudCompraService);
    private readonly authService = inject(AuthService);
    private readonly cdr = inject(ChangeDetectorRef);

    solicitudes = signal<SolicitudCompra[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    actionError = signal<string | null>(null);

    currentPage = signal(0);
    pageSize = signal(10);
    totalElements = signal(0);
    totalPages = signal(0);

    hasSolicitudes = computed(() => this.solicitudes().length > 0);
    isEmpty = computed(() => !this.loading() && !this.hasSolicitudes());

    breadcrumbs: Breadcrumb[] = [
        { label: 'Compras', url: '/compras' },
        { label: 'Mis Solicitudes' },
    ];

    estadoOptions = [
        { value: 'BORRADOR', label: 'Borrador' },
        { value: 'PENDIENTE_APROBACION', label: 'Pendiente Aprobación' },
        { value: 'APROBADA', label: 'Aprobada' },
        { value: 'RECHAZADA', label: 'Rechazada' },
        { value: 'CONVERTIDA_OC', label: 'Convertida en OC' },
        { value: 'CANCELADA', label: 'Cancelada' },
    ];

    ngOnInit(): void {
        this.loadMisSolicitudes();
    }

    loadMisSolicitudes(): void {
        const user = this.authService.currentUser();
        if (!user) return;

        this.loading.set(true);
        this.error.set(null);
        this.solicitudService
            .getMisSolicitudes(String(user.userId), this.currentPage(), this.pageSize())
            .subscribe({
                next: (page) => {
                    this.solicitudes.set(page.content);
                    this.totalElements.set(page.totalElements);
                    this.totalPages.set(page.totalPages);
                    this.loading.set(false);
                    this.cdr.markForCheck();
                },
                error: (err) => {
                    this.error.set('Error al cargar tus solicitudes');
                    this.loading.set(false);
                    console.error(err);
                    this.cdr.markForCheck();
                },
            });
    }

    onPageChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.loadMisSolicitudes();
    }

    enviarSolicitud(id: string): void {
        this.solicitudService.enviarSolicitud(id).subscribe({
            next: () => this.loadMisSolicitudes(),
            error: (err) => {
                this.actionError.set('Error al enviar la solicitud');
                console.error(err);
                this.cdr.markForCheck();
            },
        });
    }

    cancelarSolicitud(id: string): void {
        if (!confirm('¿Está seguro de cancelar esta solicitud?')) return;
        this.solicitudService.cancelarSolicitud(id).subscribe({
            next: () => this.loadMisSolicitudes(),
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
}
