import { firstValueFrom } from 'rxjs';
import { pageTotalPages } from '@core/models/pagination.model';
import type { ServerSelectDataSource, ServerSelectOption } from '@shared/components';
import type { WmsApiService } from '../services/wms-api.service';

/**
 * Fuente de zonas de un almacén para `<app-server-search-select>`. `id` es el
 * UUID (`string`) de la zona. `almacenId` acota siempre a un almacén elegido
 * previamente — si aún no hay almacén seleccionado, devuelve página vacía.
 */
export function zoneSelectSource(svc: WmsApiService, almacenId: () => string | null): ServerSelectDataSource {
    const toOption = (z: { id: string; nombre: string; codigo: string }): ServerSelectOption => ({
        id: z.id,
        label: z.nombre,
        sublabel: z.codigo,
    });
    return {
        async fetchPage(search, page, size) {
            const almacen = almacenId();
            if (!almacen) return { items: [], last: true };
            const res = await firstValueFrom(svc.getZones(almacen, page, size));
            const items = (res.content ?? [])
                .filter(z => !search || z.nombre.toLowerCase().includes(search.toLowerCase()) || z.codigo.toLowerCase().includes(search.toLowerCase()))
                .map(toOption);
            return { items, last: page >= pageTotalPages(res) - 1 };
        },
        async resolveOption(id) {
            const z = await firstValueFrom(svc.getZone(String(id)));
            return z ? toOption(z) : null;
        },
    };
}
