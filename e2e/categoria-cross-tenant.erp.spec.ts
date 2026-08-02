import { test, expect } from '@playwright/test';

/**
 * Vincular categorías a un producto estaba usando el `findAllById` heredado de JpaRepository,
 * que no acota tenant: un ADMIN podía mandar en el body el id de una categoría PRIVADA de otra
 * empresa y quedársela vinculada. `@RequiresTenantAccess` no lo ve — el companyId que viaja es
 * el propio y legítimo; lo ajeno es el id de categoría.
 *
 * Requiere una categoría privada de OTRA empresa, que no existe en la base de desarrollo (sólo
 * la empresa 1 tiene privadas). Se crea por API y se borra al final.
 */

const API = '/sales/api/v1';

test.describe.configure({ mode: 'serial' });

// El interceptor de Angular inyecta X-Tenant-ID en cada peticion del navegador; el contexto
// `request` de Playwright no pasa por el, y varios POST/PUT resuelven el tenant desde esa
// cabecera (no del query param), asi que sin ella responden 403.
test.use({ extraHTTPHeaders: { 'X-Tenant-ID': '1' } });

let categoriaAjenaId = 0;
let categoriaGlobalId = 0;
let productoId = 0;

test('prepara: categoría privada de otra empresa y producto propio', async ({ request }) => {
    // Categoría privada de la empresa 2 (el superadmin puede crear en cualquier empresa).
    const crear = await request.post(`${API}/categorias?companyId=2`, {
        data: { nombre: 'XT-CAT-AJENA-TMP', descripcion: 'temporal, prueba cross-tenant' },
    });
    expect(crear.status(), `debe poder crear la categoría de apoyo (${await crear.text()})`).toBeLessThan(400);
    categoriaAjenaId = (await crear.json()).id;

    // Una categoría global cualquiera, para comprobar que el caso legítimo sigue funcionando.
    const cats = await request.get(`${API}/categorias?companyId=1&size=100`);
    const lista = await cats.json();
    const items: Array<{ id: number; companyId?: number | null; company?: unknown }> =
        lista.content ?? lista;
    categoriaGlobalId = items.find(c => !c.companyId && !c.company)?.id ?? items[0].id;

    // Un producto de la empresa 1.
    const prods = await request.get(`${API}/productos?companyId=1&size=1`);
    const pl = await prods.json();
    productoId = (pl.content ?? pl)[0].id;

    console.log(`[PREP] categoriaAjena=${categoriaAjenaId} categoriaGlobal=${categoriaGlobalId} producto=${productoId}`);
    expect(categoriaAjenaId).toBeGreaterThan(0);
    expect(productoId).toBeGreaterThan(0);
});

test('rechaza vincular una categoría privada de otra empresa', async ({ request }) => {
    const actual = await (await request.get(`${API}/productos/${productoId}?companyId=1`)).json();
    const res = await request.put(`${API}/productos/${productoId}?companyId=1`, {
        data: { ...actual, categoriaIds: [categoriaAjenaId] },
    });
    console.log(`[XT] PUT con categoría ajena -> ${res.status()}`);
    expect(res.status(), 'no debe aceptarse una categoría de otra empresa').toBeGreaterThanOrEqual(400);

    // Y no debe haber quedado vinculada.
    const despues = await (await request.get(`${API}/productos/${productoId}?companyId=1`)).json();
    const ids: number[] = (despues.categorias ?? []).map((c: { id: number }) => c.id);
    expect(ids, 'la categoría ajena no debe quedar vinculada').not.toContain(categoriaAjenaId);
});

test('sigue aceptando una categoría global (no rompe el caso normal)', async ({ request }) => {
    const actual = await (await request.get(`${API}/productos/${productoId}?companyId=1`)).json();
    const res = await request.put(`${API}/productos/${productoId}?companyId=1`, {
        data: { ...actual, categoriaIds: [categoriaGlobalId] },
    });
    console.log(`[GLOBAL] PUT con categoría global -> ${res.status()}`);
    expect(res.status(), `la taxonomía compartida debe seguir vinculable (${await res.text()})`).toBeLessThan(400);

    const despues = await (await request.get(`${API}/productos/${productoId}?companyId=1`)).json();
    const ids: number[] = (despues.categorias ?? []).map((c: { id: number }) => c.id);
    expect(ids, 'la categoría global debe quedar vinculada').toContain(categoriaGlobalId);
});

/**
 * Encontrado al verificar lo anterior: el endurecimiento IDOR del 2026-07-29 acotó las DIRECCIONES
 * de cliente (`findByIdAndClienteId`) pero se saltó los CONTACTOS — `updateContacto` y
 * `deactivateContacto` recibían el clienteId y buscaban por `findById(ctId)` a secas. El
 * `verificarClientePertenece` del controlador sólo comprueba que el CLIENTE sea de mi empresa, así
 * que bastaba mandar un cliente propio con el ctId de otro para editar/desactivar su contacto.
 */
test('un contacto de otro cliente no se puede editar ni desactivar', async ({ request }) => {
    // Los endpoints de cliente NO llevan el segmento /v1.
    const CLI = '/sales/api/clientes';

    const cl = await request.get(`${CLI}?companyId=1&size=20`);
    const cuerpo = await cl.json();
    const clientes: Array<{ id: number }> = cuerpo.content ?? cuerpo;
    expect(clientes.length, 'hacen falta al menos 2 clientes para la prueba').toBeGreaterThan(1);

    // La prueba se hace autosuficiente: crea su propio contacto y lo borra al final, para no
    // depender de datos sembrados (en esta base no hay ninguno).
    const dueno = clientes[0].id;
    const otro = clientes[1].id;
    const crear = await request.post(`${CLI}/${dueno}/contactos?companyId=1`, {
        data: {
            nombreCompleto: 'XT-CONTACTO-IDOR-TMP', cargo: 'Compras',
            email: 'xt-idor@tmp.test', telefono: '999888777', esPrincipal: false,
        },
    });
    expect(crear.status(), `debe poder crearse el contacto de apoyo (${await crear.text()})`).toBeLessThan(400);
    const contactoId = (await crear.json()).id;
    console.log(`[IDOR] contacto ${contactoId} pertenece al cliente ${dueno}; se intenta vía cliente ${otro}`);

    try {
        const put = await request.put(`${CLI}/${otro}/contactos/${contactoId}?companyId=1`, {
            data: { nombreCompleto: 'IDOR-PWNED', cargo: 'x', email: 'idor@tmp.test', telefono: '111111111', esPrincipal: false },
        });
        console.log(`[IDOR] PUT vía un cliente que no es el dueño -> ${put.status()}`);
        expect(put.status(), 'no debe poder editarse un contacto que no es de ese cliente').toBe(404);

        const del = await request.delete(`${CLI}/${otro}/contactos/${contactoId}?companyId=1`);
        console.log(`[IDOR] DELETE vía un cliente que no es el dueño -> ${del.status()}`);
        expect(del.status(), 'no debe poder desactivarse un contacto que no es de ese cliente').toBe(404);

        // Y debe seguir intacto y activo en su dueño real.
        const sigue: Array<{ id: number; nombreCompleto: string }> =
            await (await request.get(`${CLI}/${dueno}/contactos?companyId=1`)).json();
        const encontrado = sigue.find(c => c.id === contactoId);
        expect(encontrado, 'el contacto debe seguir activo en su cliente dueño').toBeTruthy();
        expect(encontrado!.nombreCompleto, 'su nombre no debe haber cambiado').toBe('XT-CONTACTO-IDOR-TMP');

        // El camino legítimo —por su dueño real— sí debe funcionar.
        const ok = await request.put(`${CLI}/${dueno}/contactos/${contactoId}?companyId=1`, {
            data: { nombreCompleto: 'XT-CONTACTO-IDOR-TMP', cargo: 'Ventas', email: 'xt-idor@tmp.test', telefono: '999888777', esPrincipal: false },
        });
        console.log(`[IDOR] PUT por su dueño real -> ${ok.status()}`);
        expect(ok.status(), 'el camino legítimo no debe haberse roto').toBeLessThan(400);
    } finally {
        // Se desactiva por su dueño (no hay borrado duro en la API); la fila queda inactiva.
        const limpieza = await request.delete(`${CLI}/${dueno}/contactos/${contactoId}?companyId=1`);
        console.log(`[CLEAN] contacto de apoyo desactivado -> ${limpieza.status()}`);
    }
});

test('limpia: borra la categoría de apoyo', async ({ request }) => {
    const res = await request.delete(`${API}/categorias/${categoriaAjenaId}?companyId=2`);
    console.log(`[CLEAN] DELETE categoría de apoyo -> ${res.status()}`);
    expect(res.status(), 'la categoría temporal debe quedar borrada').toBeLessThan(400);
});
