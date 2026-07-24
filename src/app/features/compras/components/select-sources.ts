import { firstValueFrom } from 'rxjs';
import { pageTotalPages } from '@core/models/pagination.model';
import type { ServerSelectDataSource, ServerSelectOption } from '@shared/components';
import type { ProveedorService } from '../services/proveedor.service';
import type { Proveedor } from '../models/proveedor.model';

/**
 * Adapters de `ServerSelectDataSource` para el `<app-server-search-select>`.
 * Envuelven los servicios de Compras usando su endpoint paginado con `search`
 * server-side, sin tocar el estado compartido de los signals de listado.
 */

/**
 * Fuente de proveedores: al abrir muestra los últimos registrados (orden por
 * defecto del backend). `id` es el UUID (`string`) del proveedor.
 */
export function proveedorSelectSource(svc: ProveedorService): ServerSelectDataSource {
    const toOption = (p: Proveedor): ServerSelectOption => ({
        id: p.id!,
        label: p.razonSocial,
        sublabel: p.ruc,
    });
    return {
        async fetchPage(search, page, size) {
            const res = await svc.searchPage(page, size, search || undefined);
            const items = (res.content ?? []).map(toOption);
            return { items, last: page >= pageTotalPages(res) - 1 };
        },
        async resolveOption(id) {
            const p = await firstValueFrom(svc.getProveedorById(String(id)));
            return p ? toOption(p) : null;
        },
    };
}
