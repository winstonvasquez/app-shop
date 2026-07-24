import { Pipe, PipeTransform, inject } from '@angular/core';
import { CatalogService } from '@core/services/catalog.service';

/**
 * Resuelve el código de un catálogo a su etiqueta visible desde `erp_parameters`,
 * sin mapas de labels hardcodeados. Auto-prima el catálogo (dispara el fetch la
 * primera vez) y es reactivo: la vista se refresca cuando el HTTP resuelve.
 *
 * Uso en template:  {{ row.estado | catalogLabel:'ESTADO_CONTRATO_LABORAL' }}
 *
 * Impuro a propósito: se re-evalúa en cada CD para reflejar la carga async del catálogo.
 * (Para columnas del data-table que usan `render` fns, preferir `catalog.labelFn(tabla)`.)
 */
@Pipe({ name: 'catalogLabel', standalone: true, pure: false })
export class CatalogLabelPipe implements PipeTransform {
    private readonly catalog = inject(CatalogService);

    transform(codigo: string | null | undefined, tabla: string): string {
        if (!codigo) return '';
        return this.catalog.options(tabla)().find(o => o.codigo === codigo)?.valor ?? codigo;
    }
}
