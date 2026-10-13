import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { AprobacionService } from '../../services/aprobacion.service';
import { AprobacionPendiente } from '../../models/aprobacion.model';
import { ButtonComponent, RichTextEditorComponent } from '@shared/components';
import { ROLES } from '@shared/constants/app.constants';
import { AlertComponent } from '@shared/ui/feedback/alert/alert.component';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';

@Component({
    selector: 'app-bandeja-aprobaciones',
    standalone: true,
    imports: [DatePipe, FormsModule, ButtonComponent, RichTextEditorComponent, AlertComponent],
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
    guardando = signal(false);
    /** Error de la última acción (aprobar/rechazar) o de la carga; el modal sigue abierto para reintentar. */
    errorAccion = signal<string | null>(null);

    ngOnInit(): void {
        this.cargarPendientes();
    }

    cargarPendientes(): void {
        this.loading.set(true);
        this.errorAccion.set(null);
        const user = this.authService.currentUser();
        const rol = user?.role ?? ROLES.user;
        this.aprobacionService.getPendientes(rol).subscribe({
            next: (data) => {
                this.aprobaciones.set(data);
                this.loading.set(false);
            },
            error: (err: HttpErrorResponse) => {
                this.errorAccion.set(mensajeDeErrorHttp(err));
                this.loading.set(false);
            },
        });
    }

    abrirAprobar(id: string): void {
        this.selectedId.set(id);
        this.errorAccion.set(null);
        this.comentario.set('');
        this.showAprobarModal.set(true);
    }

    abrirRechazar(id: string): void {
        this.selectedId.set(id);
        this.errorAccion.set(null);
        this.motivo.set('');
        this.showRechazarModal.set(true);
    }

    confirmarAprobacion(): void {
        const id = this.selectedId();
        const user = this.authService.currentUser();
        if (!id || !user) return;
        this.guardando.set(true);
        this.errorAccion.set(null);
        this.aprobacionService
            .aprobar(id, this.comentario(), String(user.userId), user.username)
            .subscribe({
                next: () => {
                    this.guardando.set(false);
                    this.showAprobarModal.set(false);
                    this.cargarPendientes();
                },
                error: (err: HttpErrorResponse) => {
                    this.guardando.set(false);
                    this.errorAccion.set(mensajeDeErrorHttp(err));
                },
            });
    }

    confirmarRechazo(): void {
        const id = this.selectedId();
        const user = this.authService.currentUser();
        if (!id || !user) return;
        this.guardando.set(true);
        this.errorAccion.set(null);
        this.aprobacionService
            .rechazar(id, this.motivo(), String(user.userId), user.username)
            .subscribe({
                next: () => {
                    this.guardando.set(false);
                    this.showRechazarModal.set(false);
                    this.cargarPendientes();
                },
                error: (err: HttpErrorResponse) => {
                    this.guardando.set(false);
                    this.errorAccion.set(mensajeDeErrorHttp(err));
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
