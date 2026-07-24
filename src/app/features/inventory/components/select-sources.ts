import { firstValueFrom } from 'rxjs';
import { pageTotalPages } from '@core/models/pagination.model';
import type { ServerSelectDataSource, ServerSelectOption } from '@shared/components';
import type { InventoryApiService } from '../services/inventory-api.service';
import type { Warehouse } from '../models/inventory.models';

/**
 * Adapters de `ServerSelectDataSource` para el `<app-server-search-select>`.
 * Envuelven `InventoryApiService` usando su endpoint paginado con `search`
 * server-side, sin tocar el estado compartido de los signals de listado.
 */

/**
 * Fuente de warehouses: al abrir muestra los últimos registrados (orden por
 * defecto del backend). `id` es el `number` del warehouse. No requiere
 * companyId (el `tenantId` se resuelve del JWT en el backend).
 *
 * No existe un `getWarehouseById` puntual en `InventoryApiService`, así que
 * `resolveOption` cae a `getWarehouses()` (listado completo sin paginar) y
 * busca por id.
 */
export function warehouseSelectSource(svc: InventoryApiService): ServerSelectDataSource {
    const toOption = (w: Warehouse): ServerSelectOption => ({
        id: w.id,
        label: w.name,
        sublabel: w.code,
    });
    return {
        async fetchPage(search, page, size) {
            const res = await firstValueFrom(svc.searchWarehousesPaged(page, size, search || undefined));
            const items = (res.content ?? []).map(toOption);
            return { items, last: page >= pageTotalPages(res) - 1 };
        },
        async resolveOption(id) {
            const numericId = Number(id);
            const warehouses = await firstValueFrom(svc.getWarehouses());
            const found = (warehouses ?? []).find(w => w.id === numericId);
            return found ? toOption(found) : null;
        },
    };
}
