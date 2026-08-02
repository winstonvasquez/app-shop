import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { pageTotalPages } from '@core/models/pagination.model';
import type { ServerSelectDataSource, ServerSelectOption } from '@shared/components';
import type { ProveedorService } from '../services/proveedor.service';
import type { Proveedor } from '../models/proveedor.model';
import type { OrdenCompraService } from '../services/orden-compra.service';
import type { OrdenCompra } from '../models/orden-compra.model';
import type { DepartmentService } from '@features/rrhh/services/department.service';
import type { Department } from '@features/rrhh/models/department.model';

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

/** {@code true} si el error es un 403 de módulo no contratado (`/hr/api/**` sin RRHH en el plan). */
function esModuloNoContratado(err: unknown): boolean {
    return err instanceof HttpErrorResponse && err.status === 403;
}

/**
 * Fuente de departamentos para el campo "Departamento" de Solicitud de Compra.
 * Reutiliza la maestra de RRHH (`DepartmentService`, servicio microshopusers
 * `/hr/api/departments`, ya acotada por tenant vía `TenantContext` en el backend).
 *
 * `SolicitudCompraEntity.departamento` sigue siendo un `String` (columna existente,
 * sin migración): el `id` del `ServerSelectOption` es el NOMBRE del departamento,
 * no su id numérico, para no cambiar el contrato de `CrearSolicitudRequest` ni el
 * dato ya persistido en solicitudes creadas antes de este cambio (texto libre).
 * Esas solicitudes antiguas siguen mostrando su texto tal cual quedó guardado;
 * si no calza con ningún departamento activo de RRHH, `resolveOption` lo deja
 * pasar igual como opción de solo-lectura para no perder el dato histórico.
 *
 * **Empresa sin módulo RRHH contratado**: `ModuloContratadoFilter` (microshopusers) devuelve
 * 403 para TODO `/hr/api/**` cuando el plan no incluye RRHH — antes de este fix el select
 * quedaba permanentemente vacío (`fetchPage` nunca resolvía opciones, así que el usuario no
 * podía ni siquiera teclear un valor, porque `<app-server-search-select>` solo confirma un
 * valor seleccionando una opción de la lista). Se resuelve SIN tocar el componente compartido
 * ni `DepartmentService`: ante 403 se cae a modo texto-libre, sintetizando como opción el
 * propio texto tecleado (`search`) para que el usuario pueda seleccionarlo y así completar el
 * campo, igual que se podía escribir a mano antes de que existiera este select.
 */
export function departamentoSelectSource(svc: DepartmentService): ServerSelectDataSource {
    const toOption = (d: Department): ServerSelectOption => ({
        id: d.nombre,
        label: d.nombre,
        sublabel: d.codigo,
    });
    return {
        async fetchPage(search, page, size) {
            try {
                const res = await svc.searchPage(page, size, search || undefined, 'nombre,asc', 'true');
                const items = (res.content ?? []).map(toOption);
                return { items, last: page >= pageTotalPages(res) - 1 };
            } catch (err) {
                if (!esModuloNoContratado(err)) throw err;
                // Sin RRHH contratado: no hay maestra que listar. Si el usuario ya escribió
                // algo, se ofrece como única opción (texto libre); si no, lista vacía.
                const texto = search.trim();
                return { items: texto ? [{ id: texto, label: texto }] : [], last: true };
            }
        },
        async resolveOption(id) {
            if (id === null || id === undefined || String(id).trim() === '') return null;
            const nombre = String(id);
            try {
                // Busca coincidencia exacta contra la maestra; si no existe (dato histórico
                // de texto libre o departamento desactivado) igual se muestra como opción.
                const res = await svc.searchPage(0, 5, nombre);
                const match = (res.content ?? []).find(d => d.nombre.toLowerCase() === nombre.toLowerCase());
                return match ? toOption(match) : { id: nombre, label: nombre };
            } catch (err) {
                if (!esModuloNoContratado(err)) throw err;
                // Sin RRHH contratado no hay maestra contra qué resolver: se muestra el
                // valor ya guardado tal cual (texto libre), sin perder el dato.
                return { id: nombre, label: nombre };
            }
        },
    };
}
