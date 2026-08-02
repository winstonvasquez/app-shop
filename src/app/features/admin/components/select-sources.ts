import { firstValueFrom } from 'rxjs';
import { pageTotalPages } from '@core/models/pagination.model';
import type { ServerSelectDataSource, ServerSelectOption } from '@shared/components';
import type { OrderService } from '@core/services/order.service';
import type { OrderResponse } from '@core/models/order.model';
import type { UserService } from '@features/admin/services/user.service';
import type { UserResponse } from '@features/admin/models/user.model';
import type { ProductService } from '@core/services/product.service';
import type { ProductResponse } from '@core/models/product.model';

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

/**
 * Fuente de usuarios: al abrir muestra la primera página (últimos registrados),
 * al escribir busca server-side por `search` sobre `/api/users`. Usada por el
 * drawer "Asignar usuario" de `company-detail` para no forzar a teclear el id.
 */
export function userSelectSource(svc: UserService): ServerSelectDataSource {
    const toOption = (u: UserResponse): ServerSelectOption => ({
        id: u.id,
        label: u.username,
        sublabel: u.email,
    });
    return {
        async fetchPage(search, page, size) {
            const res = await firstValueFrom(
                svc.getAll({ page, size, sort: { field: 'username', direction: 'asc' } }, { search: search || undefined })
            );
            const items = (res.content ?? []).map(toOption);
            return { items, last: page >= pageTotalPages(res) - 1 };
        },
        async resolveOption(id) {
            // Sin id la URL queda como .../users/ y el backend responde 404: pasa al
            // abrir el drawer de alta antes de que el usuario elija a quién asignar.
            if (id === null || id === undefined || String(id).trim() === '') return null;
            try {
                const user = await firstValueFrom(svc.getById(Number(id)));
                return toOption(user);
            } catch {
                return null;
            }
        },
    };
}

/**
 * Fuente de productos: usada por el drawer de Promociones cuando alcance = "Producto específico"
 * (reemplaza el `<select>` que no dejaba elegir CUÁL producto, ver PromotionsComponent).
 */
export function productoSelectSource(svc: ProductService): ServerSelectDataSource {
    const toOption = (p: ProductResponse): ServerSelectOption => ({
        id: p.id,
        label: p.nombre,
        sublabel: p.marca,
    });
    return {
        async fetchPage(search, page, size) {
            const res = await firstValueFrom(
                svc.getAllProductsFiltered({ page, size }, { search: search || undefined })
            );
            const items = (res.content ?? []).map(toOption);
            return { items, last: page >= pageTotalPages(res) - 1 };
        },
        async resolveOption(id) {
            if (id === null || id === undefined || String(id).trim() === '') return null;
            try {
                const producto = await firstValueFrom(svc.getById(Number(id)));
                return toOption(producto);
            } catch {
                return null;
            }
        },
    };
}
