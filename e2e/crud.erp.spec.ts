import { test, expect, Page } from '@playwright/test';

/**
 * Ciclo CRUD real contra los microservicios: crear → aparece en la lista →
 * editar → el cambio persiste → los campos que no deben cambiar llegan
 * bloqueados → eliminar.
 *
 * Los registros de prueba llevan el sufijo E2E-<timestamp> para poder
 * identificarlos y para que dos corridas no choquen con las restricciones de
 * unicidad de código.
 */

const SUFIJO = `E2E-${Date.now().toString().slice(-6)}`;

interface CampoFormulario {
    /** Texto de la etiqueta en el drawer. */
    label: string | RegExp;
    valor: string;
}

interface CasoCrud {
    nombre: string;
    ruta: string;
    /** Botón que abre el drawer de alta. */
    botonNuevo: RegExp;
    /** Campos a llenar al crear. */
    campos: CampoFormulario[];
    /** Etiqueta del campo que se modifica al editar y su nuevo valor. */
    campoEditable: CampoFormulario;
    /** Etiquetas que deben llegar bloqueadas al editar (clave natural). */
    bloqueadosEnEdicion: string[];
    /** Texto único por el que se localiza la fila creada. */
    clave: string;
    /** Botón que confirma el guardado. */
    botonGuardar: RegExp;
}

const CASOS: CasoCrud[] = [
    {
        nombre: 'Categoría (ventas)',
        ruta: '/admin/categories',
        botonNuevo: /Nueva Categoría/i,
        campos: [{ label: 'Nombre', valor: `Categoría ${SUFIJO}` }],
        campoEditable: { label: 'Nombre', valor: `Categoría ${SUFIJO} editada` },
        bloqueadosEnEdicion: [],
        clave: `Categoría ${SUFIJO}`,
        botonGuardar: /Crear Categoría|Actualizar Categoría/i,
    },
    {
        nombre: 'Departamento (RRHH)',
        ruta: '/admin/rrhh/departments',
        botonNuevo: /Nuevo Departamento/i,
        campos: [
            { label: 'Código', valor: `D${SUFIJO}`.slice(0, 20) },
            { label: 'Nombre', valor: `Departamento ${SUFIJO}` },
        ],
        campoEditable: { label: 'Nombre', valor: `Departamento ${SUFIJO} editado` },
        bloqueadosEnEdicion: ['Código'],
        clave: `Departamento ${SUFIJO}`,
        botonGuardar: /Crear|Actualizar|Guardar/i,
    },
    {
        nombre: 'Almacén (inventario)',
        ruta: '/admin/inventario/almacenes',
        botonNuevo: /Nuevo Almacén/i,
        campos: [
            { label: 'Código', valor: `A${SUFIJO}`.slice(0, 20) },
            { label: 'Nombre', valor: `Almacén ${SUFIJO}` },
        ],
        campoEditable: { label: 'Nombre', valor: `Almacén ${SUFIJO} editado` },
        bloqueadosEnEdicion: ['Código'],
        clave: `Almacén ${SUFIJO}`,
        botonGuardar: /Crear|Actualizar|Guardar/i,
    },
];

/**
 * Contenedor del formulario. Es importante acotar a él: la toolbar de la tabla
 * también tiene campos etiquetados (los filtros) y una búsqueda por etiqueta a
 * nivel de página llenaría el filtro en vez del formulario.
 */
function drawerDe(page: Page) {
    return page.locator('app-drawer, .drawer.open').first();
}

/** Llena un campo del drawer por su etiqueta. */
async function llenar(page: Page, campo: CampoFormulario): Promise<void> {
    const input = drawerDe(page).getByLabel(campo.label, { exact: false }).first();
    await expect(input, `el formulario debe tener el campo "${campo.label}"`).toBeVisible({ timeout: 10_000 });
    await input.fill(campo.valor);
}

/** Busca en la tabla usando el buscador del toolbar. */
async function buscar(page: Page, texto: string): Promise<void> {
    const caja = page.locator('.toolbar-search input').first();
    if ((await caja.count()) === 0) return;
    await caja.fill(texto);
    await page.locator('.toolbar-search .btn').first().click();
    await page.waitForTimeout(1200);
}

/**
 * Guarda el formulario y espera a que el drawer se cierre. Si no se cierra, el
 * guardado falló: se recoge el mensaje de error del propio formulario para que
 * el test diga la causa en vez de morir en un timeout opaco.
 */
async function guardar(page: Page, boton: RegExp): Promise<void> {
    await drawerDe(page).getByRole('button', { name: boton }).last().click();

    const drawer = page.locator('app-drawer .drawer-body, .drawer.open').first();
    try {
        await expect(drawer).toBeHidden({ timeout: 12_000 });
    } catch {
        const errores = await page
            .locator('.alert-error, .form-error, .drawer-body .alert')
            .allInnerTexts();
        const detalle = errores.map(e => e.trim()).filter(Boolean).join(' | ') || 'sin mensaje visible';
        throw new Error(`el formulario no se guardó y el drawer sigue abierto — ${detalle}`);
    }
    await page.waitForTimeout(1200);
}

for (const caso of CASOS) {
    test.describe(`CRUD ${caso.nombre}`, () => {
        test(`crear, editar y eliminar`, async ({ page }) => {
            test.setTimeout(120_000);

            // ── Listar ───────────────────────────────────────────────────
            await page.goto(caso.ruta);
            await expect(page.locator('app-data-table')).toBeVisible({ timeout: 25_000 });

            // ── Crear ────────────────────────────────────────────────────
            await page.getByRole('button', { name: caso.botonNuevo }).first().click();
            for (const campo of caso.campos) await llenar(page, campo);
            await guardar(page, caso.botonGuardar);

            await buscar(page, caso.clave);
            const fila = page.locator('tbody tr', { hasText: caso.clave });
            await expect(fila, `el registro creado debe aparecer en la lista`).toHaveCount(1, { timeout: 15_000 });

            // ── Editar ───────────────────────────────────────────────────
            await fila.locator('button[title*="ditar"], .btn-icon-edit').first().click();
            await page.waitForTimeout(1200);

            // Las claves naturales llegan bloqueadas al editar
            for (const etiqueta of caso.bloqueadosEnEdicion) {
                const control = drawerDe(page).getByLabel(etiqueta, { exact: false }).first();
                await expect(control, `"${etiqueta}" no debe poder cambiarse tras el alta`).toBeDisabled();
            }

            await llenar(page, caso.campoEditable);
            await guardar(page, caso.botonGuardar);

            await buscar(page, caso.campoEditable.valor);
            await expect(
                page.locator('tbody tr', { hasText: caso.campoEditable.valor }),
                'el cambio debe persistir en el backend',
            ).toHaveCount(1, { timeout: 15_000 });

            // ── Eliminar ─────────────────────────────────────────────────
            page.once('dialog', d => d.accept());
            const filaEditada = page.locator('tbody tr', { hasText: caso.campoEditable.valor });
            const borrar = filaEditada.locator('button[title*="liminar"], button[title*="esactivar"], .btn-icon-delete').first();
            if ((await borrar.count()) > 0) {
                await borrar.click();
                await page.waitForTimeout(2000);
            }
        });
    });
}
