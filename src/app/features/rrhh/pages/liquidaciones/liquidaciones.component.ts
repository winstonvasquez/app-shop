import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ServerSearchSelectComponent } from '@shared/components';
import { EmployeeService } from '../../services/employee.service';
import { employeeSelectSource } from '../../components/select-sources';
import { LiquidacionService } from '../../services/liquidacion.service';
import { LiquidacionCese } from '../../models/liquidacion.model';
import { mensajeDeErrorHttp } from '@core/utils/http-error.util';

/**
 * Liquidación al cese. Llega con `?employeeId=N` tras «Finalizar contrato» y muestra el cálculo
 * (GET /calculo) con opción de registrarlo (POST). Debajo, el listado de liquidaciones registradas.
 * Registrar crea además el pago PENDING en tesorería (síncrono: si tesorería falla no se registra nada). Sin asiento contable.
 */
@Component({
    selector: 'app-liquidaciones',
    standalone: true,
    imports: [DecimalPipe, DatePipe, FormsModule, ReactiveFormsModule, ServerSearchSelectComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './liquidaciones.component.html',
})
export class LiquidacionesComponent implements OnInit {
    private readonly service = inject(LiquidacionService);
    private readonly route = inject(ActivatedRoute);

    /** Mismo buscador server-side de empleados que usan asistencia y contratos. */
    readonly employeeSource = employeeSelectSource(inject(EmployeeService));
    readonly empleado = new FormControl<number | null>(null);

    constructor() {
        // valueChanges (no effect): AbstractControl.value no es señal.
        this.empleado.valueChanges.pipe(takeUntilDestroyed()).subscribe(id => {
            this.mensaje.set(null);
            if (id) void this.calcular(Number(id));
            else this.calculo.set(null);
        });
    }

    readonly calculo = signal<LiquidacionCese | null>(null);
    readonly lista = signal<LiquidacionCese[]>([]);
    readonly cargando = signal(false);
    readonly error = signal<string | null>(null);
    readonly mensaje = signal<string | null>(null);
    observaciones = '';

    async ngOnInit(): Promise<void> {
        const empId = Number(this.route.snapshot.queryParamMap.get('employeeId'));
        await this.recargarLista();
        if (empId) await this.calcular(empId);
    }

    private msg(err: unknown, porDefecto: string): string {
        return err instanceof HttpErrorResponse ? mensajeDeErrorHttp(err) : porDefecto;
    }

    private async recargarLista(): Promise<void> {
        try {
            this.lista.set(await this.service.listar());
        } catch (err) {
            this.error.set(this.msg(err, 'No se pudo cargar el listado de liquidaciones.'));
        }
    }

    async calcular(employeeId: number): Promise<void> {
        this.cargando.set(true);
        this.error.set(null);
        try {
            this.calculo.set(await this.service.calcular(employeeId));
        } catch (err) {
            this.calculo.set(null);
            this.error.set(this.msg(err, 'No se pudo calcular la liquidación.'));
        } finally {
            this.cargando.set(false);
        }
    }

    async registrar(): Promise<void> {
        const c = this.calculo();
        if (!c) return;
        this.cargando.set(true);
        this.error.set(null);
        try {
            await this.service.registrar(c.employeeId, this.observaciones.trim() || undefined);
            this.mensaje.set(c.total > 0
                ? `Liquidación de ${c.employeeName} registrada. Se generó el pago pendiente en tesorería.`
                : `Liquidación de ${c.employeeName} registrada (total 0: no se generó pago).`);
            this.calculo.set(null);
            this.observaciones = '';
            this.empleado.reset(null, { emitEvent: false });
            await this.recargarLista();
        } catch (err) {
            // 409 = ya registrada; 400 = tesorería no respondió (no se registró nada, reintentar): mensaje del backend.
            this.error.set(this.msg(err, 'No se pudo registrar la liquidación.'));
        } finally {
            this.cargando.set(false);
        }
    }
}
