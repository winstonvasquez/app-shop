import { firstValueFrom } from 'rxjs';
import { pageTotalPages } from '@core/models/pagination.model';
import type { ServerSelectDataSource, ServerSelectOption } from '@shared/components';
import type { OrderService } from '@core/services/order.service';
import type { OrderResponse } from '@core/models/order.model';

/**
 * Adapter de `ServerSelectDataSource` para el `<app-server-search-select>` — resuelve
 * pedidos reales (en vez del input de texto libre "número de orden" que nunca enviaba
 * un pedidoId real al backend, ver F4.2). Mismo patrón que `warehouseSelectSource`
 * (features/inventory/components/select-sources.ts).
 */
export function pedidoSelectSource(svc: OrderService): ServerSelectDataSource {
    const toOption = (o: OrderResponse): ServerSelectOption => ({
        id: o.id,
        label: `#${o.id}`,
        sublabel: `S/ ${(o.total ?? 0).toFixed(2)}`,
    });
    return {
        async fetchPage(search, page, size) {
            const res = await firstValueFrom(
                svc.getAll({ page, size, sort: { field: 'fechaPedido', direction: 'desc' } }, search || undefined)
            );
            const items = (res.content ?? []).map(toOption);
            return { items, last: page >= pageTotalPages(res) - 1 };
        },
        async resolveOption(id) {
            try {
                const order = await firstValueFrom(svc.getById(Number(id)));
                return toOption(order);
            } catch {
                return null;
            }
        },
    };
}
