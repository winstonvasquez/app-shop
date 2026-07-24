import { firstValueFrom } from 'rxjs';
import { pageTotalPages } from '@core/models/pagination.model';
import type { ServerSelectDataSource, ServerSelectOption } from '@shared/components';
import type { AlmacenService } from '../services/almacen.service';
import type { Almacen } from '../models/almacen.model';

/**
 * Adapters de `ServerSelectDataSource` para el `<app-server-search-select>`.
 * Envuelven `AlmacenService` usando su endpoint paginado con `search`
 * server-side, sin tocar el estado compartido de los signals de listado.
 */

/**
 * Fuente de almacenes: al abrir muestra los últimos registrados (orden por
 * defecto del backend). `id` es el UUID (`string`) del almacén.
 *
 * `companyIdFn` resuelve el `companyId` (Long) requerido por el backend
 * (ej. `() => authService.currentUser()?.activeCompanyId`). Si aún no hay
 * companyId disponible (login en curso, etc.) se devuelve página vacía.
 */
export function almacenSelectSource(
    svc: AlmacenService,
    companyIdFn: () => number | undefined,
): ServerSelectDataSource {
    const toOption = (a: Almacen): ServerSelectOption => ({
        id: a.id,
        label: a.nombre,
        sublabel: a.codigo,
    });
    return {
        async fetchPage(search, page, size) {
            const companyId = companyIdFn();
            if (companyId === undefined || companyId === null) {
                return { items: [], last: true };
            }
            const res = await svc.searchPage(companyId, page, size, search || undefined);
            const items = (res.content ?? []).map(toOption);
            return { items, last: page >= pageTotalPages(res) - 1 };
        },
        async resolveOption(id) {
            const companyId = companyIdFn();
            if (companyId === undefined || companyId === null) return null;
            const a = await firstValueFrom(svc.getAlmacenById(String(id), String(companyId)));
            return a ? toOption(a) : null;
        },
    };
}
