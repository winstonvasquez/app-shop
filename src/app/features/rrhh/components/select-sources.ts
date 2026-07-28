import { firstValueFrom } from 'rxjs';
import { pageTotalPages } from '@core/models/pagination.model';
import type { ServerSelectDataSource, ServerSelectOption } from '@shared/components';
import type { EmployeeService } from '../services/employee.service';
import type { DepartmentService } from '../services/department.service';
import type { PositionService } from '../services/position.service';
import type { UserService } from '@features/admin/services/user.service';

/**
 * Adapters de `ServerSelectDataSource` para el `<app-server-search-select>`.
 * Envuelven los servicios de RRHH usando su endpoint `/paged` (búsqueda + orden
 * server-side) sin tocar el estado compartido de los signals de listado.
 */

/** Fuente de empleados: al abrir muestra los últimos registrados (createdAt desc). */
export function employeeSelectSource(svc: EmployeeService): ServerSelectDataSource {
    const toOption = (e: { id: number; nombres: string; apellidos: string; codigoEmpleado: string }): ServerSelectOption => ({
        id: e.id,
        label: `${e.nombres} ${e.apellidos}`.trim(),
        sublabel: e.codigoEmpleado,
    });
    return {
        async fetchPage(search, page, size) {
            const res = await svc.searchPage(page, size, search || undefined, 'createdAt,desc');
            const items = (res.content ?? []).map(toOption);
            return { items, last: page >= pageTotalPages(res) - 1 };
        },
        async resolveOption(id) {
            // Sin id la URL se arma con NaN y el backend responde error: pasa al
            // abrir un formulario cuya referencia todavía no está elegida.
            if (id === null || id === undefined || String(id).trim() === '') return null;
            const e = await svc.getEmployeeById(Number(id));
            return e ? toOption(e) : null;
        },
    };
}

/**
 * Fuente de departamentos: al abrir muestra los últimos registrados (createdAt desc).
 * `excludeId` permite ocultar un departamento de la lista (ej. evitar que sea su propio padre).
 */
export function departmentSelectSource(
    svc: DepartmentService,
    opts?: { excludeId?: () => number | null | undefined },
): ServerSelectDataSource {
    const toOption = (d: { id: number; nombre: string; codigo: string }): ServerSelectOption => ({
        id: d.id,
        label: d.nombre,
        sublabel: d.codigo,
    });
    return {
        async fetchPage(search, page, size) {
            const res = await svc.searchPage(page, size, search || undefined, 'createdAt,desc');
            const exclude = opts?.excludeId?.();
            const items = (res.content ?? [])
                .filter(d => exclude == null || d.id !== exclude)
                .map(toOption);
            return { items, last: page >= pageTotalPages(res) - 1 };
        },
        async resolveOption(id) {
            // Sin id la URL se arma con NaN y el backend responde error: pasa al
            // abrir un formulario cuya referencia todavía no está elegida.
            if (id === null || id === undefined || String(id).trim() === '') return null;
            const d = await svc.getDepartmentById(Number(id));
            return d ? toOption(d) : null;
        },
    };
}

/**
 * Fuente de puestos: al abrir muestra los últimos registrados (createdAt desc).
 * `departmentId` permite acotar la búsqueda a un departamento (filtro server-side,
 * soportado nativamente por `GET /positions/paged?departmentId=`).
 */
export function positionSelectSource(
    svc: PositionService,
    opts?: { departmentId?: () => number | null | undefined },
): ServerSelectDataSource {
    const toOption = (p: { id: number; nombre: string; codigo: string }): ServerSelectOption => ({
        id: p.id,
        label: p.nombre,
        sublabel: p.codigo,
    });
    return {
        async fetchPage(search, page, size) {
            const departmentId = opts?.departmentId?.() ?? undefined;
            const res = await svc.searchPage(page, size, search || undefined, undefined, departmentId ?? undefined);
            const items = (res.content ?? []).map(toOption);
            return { items, last: page >= pageTotalPages(res) - 1 };
        },
        async resolveOption(id) {
            // Sin id la URL se arma con NaN y el backend responde error: pasa al
            // abrir un formulario cuya referencia todavía no está elegida.
            if (id === null || id === undefined || String(id).trim() === '') return null;
            const p = await svc.getPositionById(Number(id));
            return p ? toOption(p) : null;
        },
    };
}

/**
 * Fuente de usuarios del sistema, para vincular un empleado con su cuenta de
 * acceso. Ese vínculo (`Employee.userId`) es lo que habilita el portal de
 * autoservicio: sin él, el empleado entra y no ve ninguno de sus datos.
 */
export function usuarioSelectSource(svc: UserService): ServerSelectDataSource {
    const toOption = (u: { id: number; username: string; email?: string }): ServerSelectOption => ({
        id: u.id,
        label: u.username,
        sublabel: u.email,
    });
    return {
        async fetchPage(search, page, size) {
            const res = await firstValueFrom(svc.getAll({ page, size }, search ? { search } : undefined));
            const items = (res.content ?? []).map(toOption);
            return { items, last: page >= pageTotalPages(res) - 1 };
        },
        async resolveOption(id) {
            if (id === null || id === undefined || String(id).trim() === '') return null;
            const u = await firstValueFrom(svc.getById(Number(id)));
            return u ? toOption(u) : null;
        },
    };
}
