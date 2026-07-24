import { pageTotalPages } from '@core/models/pagination.model';
import type { ServerSelectDataSource, ServerSelectOption } from '@shared/components';
import type { EmployeeService } from '../services/employee.service';
import type { DepartmentService } from '../services/department.service';

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
            const d = await svc.getDepartmentById(Number(id));
            return d ? toOption(d) : null;
        },
    };
}
