import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { SystemParameterService } from '@core/services/system-parameter.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StoreConfigService } from '@core/services/store-config.service';
import { detalleDelBackend } from '@core/utils/http-error.util';
import { DsButtonComponent } from '@shared/ui/ds';
import {
    ErroresReclamo, RECLAMO_FORM_VACIO, construirReclamo, erroresDeReclamo,
    fechaLimiteLegible, mensajeDeFalloReclamo,
} from './reclamo.form';
import { Reclamo, TIPOS_DOC_RECLAMO } from './reclamo.model';
import { ReclamoService } from './reclamo.service';

/**
 * Libro de Reclamaciones virtual (Ley 29571 art. 150, DS 011-2011-PCM). Página PÚBLICA: la tienda la
 * resuelve el backend por X-Tenant-Domain, nunca el formulario. El código devuelto es la constancia.
 */
@Component({
    selector: 'app-libro-reclamaciones',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, RouterLink, DsButtonComponent],
    templateUrl: './libro-reclamaciones.component.html',
    styleUrl: './libro-reclamaciones.component.scss',
})
export class LibroReclamacionesComponent {
    private readonly fb = inject(FormBuilder);
    private readonly service = inject(ReclamoService);
    private readonly destroyRef = inject(DestroyRef);
    protected readonly sc = inject(StoreConfigService);
    protected readonly params = inject(SystemParameterService);

    protected readonly tiposDoc = TIPOS_DOC_RECLAMO;
    protected readonly fechaLegible = fechaLimiteLegible;
    protected readonly form = this.fb.nonNullable.group(RECLAMO_FORM_VACIO);

    protected readonly errores = signal<ErroresReclamo>({});
    protected readonly enviando = signal(false);
    protected readonly fallo = signal<string | null>(null);
    protected readonly constancia = signal<Reclamo | null>(null);
    private intentado = false;

    constructor() {
        // Tras el primer intento fallido, los errores se actualizan al escribir.
        this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            if (this.intentado) this.errores.set(erroresDeReclamo(this.form.getRawValue()));
        });
    }

    protected enviar(): void {
        if (this.enviando()) return;
        this.intentado = true;
        const raw = this.form.getRawValue();
        const errores = erroresDeReclamo(raw);
        this.errores.set(errores);
        if (Object.keys(errores).length > 0) {
            this.fallo.set('Revisa los campos marcados antes de enviar.');
            return;
        }
        this.fallo.set(null);
        this.enviando.set(true);
        this.service.crear(construirReclamo(raw)).subscribe({
            next: (reclamo) => {
                this.constancia.set(reclamo);
                this.enviando.set(false);
                window.scrollTo({ top: 0 });
            },
            error: (err: HttpErrorResponse) => {
                this.fallo.set(mensajeDeFalloReclamo(err.status, detalleDelBackend(err)));
                this.enviando.set(false);
            },
        });
    }

    protected imprimir(): void {
        window.print();
    }
}
