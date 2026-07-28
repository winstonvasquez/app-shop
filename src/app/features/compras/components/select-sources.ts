import { firstValueFrom } from 'rxjs';
import { pageTotalPages } from '@core/models/pagination.model';
import type { ServerSelectDataSource, ServerSelectOption } from '@shared/components';
import type { ProveedorService } from '../services/proveedor.service';
import type { Proveedor } from '../models/proveedor.model';
import type { OrdenCompraService } from '../services/orden-compra.service';
import type { OrdenCompra } from '../models/orden-compra.model';

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
            // Sin id la URL queda como .../proveedores/ y el backend responde 500:
            // pasa al abrir un formulario cuyo proveedor todavía no está elegido.
            if (id === null || id === undefined || String(id).trim() === '') return null;
            const p = await firstValueFrom(svc.getProveedorById(String(id)));
            return p ? toOption(p) : null;
        },
    };
}

/**
 * Fuente de órdenes de compra: al abrir muestra las últimas registradas
 * (orden por defecto del backend). `id` es el UUID (`string`) de la OC.
 * Usada por Recepción / Factura de Proveedor / Devolución para resolver el
 * enlace del 3-Way Match, y por Evaluación de Proveedor para vincular
 * opcionalmente la evaluación a la OC que la origina — sin que el usuario
 * teclee UUIDs a mano.
 */
export function ordenCompraSelectSource(svc: OrdenCompraService): ServerSelectDataSource {
    const toOption = (o: OrdenCompra): ServerSelectOption => ({
        id: o.id!,
        label: o.codigo,
        sublabel: o.proveedorNombre ?? o.proveedorRuc,
    });
    return {
        async fetchPage(search, page, size) {
            const res = await svc.searchPage(page, size, search || undefined);
            const items = (res.content ?? []).map(toOption);
            return { items, last: page >= pageTotalPages(res) - 1 };
        },
        async resolveOption(id) {
            // Sin id la URL queda como .../ordenes-compra/ y el backend responde 404:
            // pasa al abrir un formulario cuya OC todavía no está elegida.
            if (id === null || id === undefined || String(id).trim() === '') return null;
            const o = await firstValueFrom(svc.getOrdenById(String(id)));
            return o ? toOption(o) : null;
        },
    };
}
