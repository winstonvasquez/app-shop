import { firstValueFrom } from 'rxjs';
import { pageTotalPages } from '@core/models/pagination.model';
import type { ServerSelectDataSource, ServerSelectOption } from '@shared/components';
import type { CuentaService, CuentaContable } from '../services/cuenta.service';

/**
 * Adapters de `ServerSelectDataSource` para el `<app-server-search-select>` del módulo
 * de Contabilidad. Envuelven `CuentaService` usando su listado paginado con `busqueda`
 * server-side (código o nombre), sin tocar el estado compartido de los signals de listado.
 */

/**
 * Fuente de cuentas contables (Plan de Cuentas PCGE): usada por el selector de "Cuenta
 * padre" del alta/edición manual de cuentas. `id` es el UUID (`string`) de la cuenta.
 */
export function cuentaContableSelectSource(svc: CuentaService): ServerSelectDataSource {
    const toOption = (c: CuentaContable): ServerSelectOption => ({
        id: c.id,
        label: `${c.codigo} — ${c.nombre}`,
        sublabel: `Nivel ${c.nivel}`,
    });
    return {
        async fetchPage(search, page, size) {
            const res = await firstValueFrom(svc.listarPaginado({ page, size, busqueda: search || undefined }));
            const items = (res.content ?? []).map(toOption);
            return { items, last: page >= pageTotalPages(res) - 1 };
        },
        async resolveOption(id) {
            // Sin id la URL queda como .../cuentas/ y el backend responde 404: pasa al
            // abrir un formulario de alta, donde la cuenta padre todavía no está elegida.
            if (id === null || id === undefined || String(id).trim() === '') return null;
            const c = await firstValueFrom(svc.obtenerPorId(String(id)));
            return c ? toOption(c) : null;
        },
    };
}
