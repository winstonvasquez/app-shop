import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService } from '@core/auth/auth.service';
import { AprobacionService } from '../../services/aprobacion.service';
import { AprobacionPendiente } from '../../models/aprobacion.model';

@Component({
    selector: 'app-bandeja-aprobaciones',
    standalone: true,
    imports: [DatePipe],
    templateUrl: './bandeja-aprobaciones.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaAprobacionesComponent implements OnInit {
    private aprobacionService = inject(AprobacionService);
    private authService = inject(AuthService);

    aprobaciones = signal<AprobacionPendiente[]>([]);
    loading = signal(false);
    selectedId = signal<string | null>(null);
    comentario = signal('');
    motivo = signal('');
    showAprobarModal = signal(false);
    showRechazarModal = signal(false);

    ngOnInit(): void {
        this.cargarPendientes();
    }

    cargarPendientes(): void {
        this.loading.set(true);
        const user = this.authService.currentUser();
        const rol = user?.role ?? 'USER';
        this.aprobacionService.getPendientes(rol).subscribe({
            next: (data) => {
                this.aprobaciones.set(data);
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
    }

    abrirAprobar(id: string): void {
        this.selectedId.set(id);
        this.comentario.set('');
        this.showAprobarModal.set(true);
    }

    abrirRechazar(id: string): void {
        this.selectedId.set(id);
        this.motivo.set('');
        this.showRechazarModal.set(true);
    }

    confirmarAprobacion(): void {
        const id = this.selectedId();
        const user = this.authService.currentUser();
        if (!id || !user) return;
        this.aprobacionService
            .aprobar(id, this.comentario(), String(user.userId), user.username)
            .subscribe({
                next: () => {
                    this.showAprobarModal.set(false);
                    this.cargarPendientes();
                },
            });
    }

    confirmarRechazo(): void {
        const id = this.selectedId();
        const user = this.authService.currentUser();
        if (!id || !user) return;
        this.aprobacionService
            .rechazar(id, this.motivo(), String(user.userId), user.username)
            .subscribe({
                next: () => {
                    this.showRechazarModal.set(false);
                    this.cargarPendientes();
                },
            });
    }

    cerrarModales(): void {
        this.showAprobarModal.set(false);
        this.showRechazarModal.set(false);
    }

    formatMonto(monto: number): string {
        return `S/ ${monto.toFixed(2)}`;
    }
}
