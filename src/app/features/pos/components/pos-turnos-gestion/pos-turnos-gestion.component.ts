import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '@core/auth/auth.service';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';
import { TurnoCajaListado } from '../../models/turno-caja.model';
import { PosTurnoService } from '../../services/pos-turno.service';
import { CierreArqueoData, PosDenominationCounterComponent } from '../pos-denomination-counter/pos-denomination-counter.component';

/**
 * Turnos de la empresa para ADMIN/GERENTE: estado, cajero, diferencia de arqueo, Reporte Z y
 * «Cierre forzoso» de un turno abandonado (observación obligatoria). Usa clases propias de POS,
 * no las del admin (`.data-table`/`.table-toolbar` colapsan el layout del POS).
 */
@Component({
    selector: 'app-pos-turnos-gestion',
    standalone: true,
    imports: [DatePipe, PosDenominationCounterComponent],
    templateUrl: './pos-turnos-gestion.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosTurnosGestionComponent implements OnInit {
    private readonly turnoService = inject(PosTurnoService);
    readonly auth = inject(AuthService);

    readonly verZ = output<number>();
    /** Id del turno cerrado a la fuerza: la caja actual puede ser ese mismo turno. */
    readonly turnoCerrado = output<number>();

    readonly turnos = signal<TurnoCajaListado[]>([]);
    readonly estado = signal<'' | 'ABIERTO' | 'CERRADO'>('ABIERTO');
    readonly page = signal(0);
    readonly totalPages = signal(0);
    readonly cargando = signal(false);
    readonly error = signal('');
    readonly aviso = signal('');

    /** Turno en cierre forzoso: primero la observación, luego el conteo de efectivo. */
    readonly forzoso = signal<TurnoCajaListado | null>(null);
    readonly observacion = signal('');
    readonly contando = signal(false);
    readonly enviando = signal(false);

    ngOnInit(): void {
        if (this.auth.puedeGestionarTienda()) this.cargar();
    }

    cargar(): void {
        this.cargando.set(true);
        this.error.set('');
        this.turnoService.listarTurnos({ estado: this.estado() || undefined, page: this.page(), size: 10 }).subscribe({
            next: p => {
                this.turnos.set(p.content);
                this.totalPages.set(p.totalPages);
                this.cargando.set(false);
            },
            error: err => {
                this.cargando.set(false);
                this.error.set(this.mensaje(err, 'No se pudo cargar el listado de turnos'));
            },
        });
    }

    cambiarEstado(valor: string): void {
        this.estado.set(valor === 'ABIERTO' || valor === 'CERRADO' ? valor : '');
        this.page.set(0);
        this.cargar();
    }

    irA(pagina: number): void {
        this.page.set(pagina);
        this.cargar();
    }

    abrirForzoso(t: TurnoCajaListado): void {
        this.observacion.set('');
        this.contando.set(false);
        this.error.set('');
        this.aviso.set('');
        this.forzoso.set(t);
    }

    cancelarForzoso(): void {
        this.forzoso.set(null);
    }

    cerrarForzoso(data: CierreArqueoData): void {
        const t = this.forzoso();
        const observacion = this.observacion().trim();
        if (!t || !observacion || this.enviando()) return;
        this.enviando.set(true);
        this.turnoService.cierreForzoso(t.id, { ...data, observacion }).subscribe({
            next: () => {
                this.enviando.set(false);
                this.forzoso.set(null);
                this.aviso.set(`Turno #${t.id} cerrado a la fuerza`);
                this.turnoCerrado.emit(t.id);
                this.cargar();
            },
            error: err => {
                this.enviando.set(false);
                this.forzoso.set(null);
                this.cargar();
                this.error.set(this.mensaje(err, 'No se pudo cerrar el turno'));
            },
        });
    }

    fmt(v: number | null | undefined): string {
        return (v ?? 0).toFixed(2);
    }

    private mensaje(err: unknown, porDefecto: string): string {
        return err instanceof HttpErrorResponse ? mensajeDeErrorHttp(err) : porDefecto;
    }
}
