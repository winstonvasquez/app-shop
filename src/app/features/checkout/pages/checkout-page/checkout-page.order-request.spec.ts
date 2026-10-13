import { describe, expect, it } from 'vitest';
import { Address } from '@core/services/address/address.service';
import { CartItem } from '@features/cart/services/cart.service';
import { construirOrderRequest, DatosDelCheckout, direccionLocalDeInvitado } from './checkout-page.order-request';

function direccion(parcial: Partial<Address> = {}): Address {
    return {
        id: 1,
        tipoDireccion: 'CASA',
        departamento: 'Lima',
        provincia: 'Lima',
        distrito: 'Miraflores',
        direccion: 'Av. Larco 123',
        referencia: 'Frente al parque',
        ubigeo: '150122',
        esPrincipal: true,
        activo: true,
        fechaCreacion: '2026-01-01',
        nombreDestinatario: 'Ana Quispe',
        telefonoDestinatario: '987654321',
        ...parcial,
    };
}

function item(parcial: Partial<CartItem> = {}): CartItem {
    return {
        productId: 10,
        variantId: 5,
        name: 'Polo',
        price: 49.9,
        quantity: 2,
        image: 'polo.jpg',
        selected: true,
        ...parcial,
    };
}

function datos(parcial: Partial<DatosDelCheckout> = {}): DatosDelCheckout {
    return {
        usuarioId: 77,
        esInvitado: false,
        emailInvitado: undefined,
        items: [item()],
        direccion: direccion(),
        metodoPago: 'VIS',
        codigoCupon: 'VERANO10',
        zonaEnvioId: 3,
        ...parcial,
    };
}

describe('construirOrderRequest', () => {
    it('con todo relleno traslada cada campo a su nombre del backend', () => {
        expect(construirOrderRequest(datos())).toEqual({
            usuarioId: 77,
            guestEmail: undefined,
            detalles: [{ productoId: 10, varianteId: 5, cantidad: 2 }],
            direccionEnvio: {
                direccion: 'Av. Larco 123',
                ciudad: 'Miraflores',
                codigoPostal: '150122',
                pais: 'Perú',
                region: 'Lima',
                nombreDestinatario: 'Ana Quispe',
                telefono: '987654321',
            },
            metodoPago: 'VIS',
            codigoCupon: 'VERANO10',
            zonaEnvioId: 3,
        });
    });

    it('con todo lo opcional ausente aplica los valores por defecto uno a uno', () => {
        const r = construirOrderRequest(datos({
            usuarioId: null,
            esInvitado: false,
            items: [item({ variantId: undefined })],
            direccion: direccion({ ubigeo: null, nombreDestinatario: null, telefonoDestinatario: null }),
            codigoCupon: null,
            zonaEnvioId: null,
        }));

        expect(r.usuarioId).toBeNull();
        expect(r.detalles[0].varianteId).toBe(0);
        expect(r.direccionEnvio.codigoPostal).toBe('00000');
        expect(r.direccionEnvio.nombreDestinatario).toBe('');
        expect(r.direccionEnvio.telefono).toBe('');
        expect(r.codigoCupon).toBeUndefined();
        expect(r.zonaEnvioId).toBeUndefined();
        expect(r.direccionEnvio.pais).toBe('Perú');
    });

    // ── invitado vs. usuario logueado ────────────────────────────────────────────────────
    it('el invitado manda su email y sin usuarioId', () => {
        const r = construirOrderRequest(datos({
            usuarioId: null, esInvitado: true, emailInvitado: 'invitado@correo.pe',
        }));
        expect(r.guestEmail).toBe('invitado@correo.pe');
        expect(r.usuarioId).toBeNull();
    });

    it('el usuario logueado NUNCA manda guestEmail aunque el formulario conserve uno', () => {
        const r = construirOrderRequest(datos({ esInvitado: false, emailInvitado: 'viejo@correo.pe' }));
        expect(r.guestEmail).toBeUndefined();
    });

    it('el invitado sin email tecleado manda guestEmail ausente, no nulo', () => {
        const r = construirOrderRequest(datos({ esInvitado: true, emailInvitado: null }));
        expect(r.guestEmail).toBeUndefined();
    });

    // ── bordes que el código original ya trataba ─────────────────────────────────────────
    it('un ubigeo de cadena vacía NO se sustituye por 00000 (?? sólo cubre el nulo)', () => {
        const r = construirOrderRequest(datos({ direccion: direccion({ ubigeo: '' }) }));
        expect(r.direccionEnvio.codigoPostal).toBe('');
    });

    it('la variante 0 legítima se conserva y no se confunde con «sin variante»', () => {
        const r = construirOrderRequest(datos({ items: [item({ variantId: 0 })] }));
        expect(r.detalles[0].varianteId).toBe(0);
    });

    it('sólo viajan los ítems seleccionados: lo deseleccionado ni se pide ni se cobra', () => {
        const r = construirOrderRequest(datos({
            items: [item({ productId: 1, selected: true }), item({ productId: 2, selected: false })],
        }));
        expect(r.detalles.map(d => d.productoId)).toEqual([1]);
    });

    it('sin ningún ítem seleccionado, detalles queda vacío', () => {
        const r = construirOrderRequest(datos({ items: [item({ selected: false })] }));
        expect(r.detalles).toEqual([]);
    });

    it('un carrito vacío produce detalles vacío, no undefined', () => {
        expect(construirOrderRequest(datos({ items: [] })).detalles).toEqual([]);
    });
});

describe('direccionLocalDeInvitado', () => {
    const form = {
        departamento: 'Lima', provincia: 'Lima', distrito: 'Miraflores', direccion: 'Av. Larco 123',
        referencia: '', ubigeo: '', esPrincipal: false,
        nombreDestinatario: 'Ana Quispe', telefonoDestinatario: '987654321',
    };

    it('arma una dirección local sin id de servidor y con ubigeo nulo si viene vacío', () => {
        const a = direccionLocalDeInvitado(form, new Date('2026-01-01T00:00:00Z'));
        expect(a.id).toBe(0);
        expect(a.ubigeo).toBeNull();
        expect(a.distrito).toBe('Miraflores');
        expect(a.nombreDestinatario).toBe('Ana Quispe');
        expect(a.fechaCreacion).toBe('2026-01-01T00:00:00.000Z');
    });

    it('el pedido manda la dirección completa, no un id', () => {
        const pedido = construirOrderRequest({
            usuarioId: null, esInvitado: true, emailInvitado: 'a@b.pe', items: [],
            direccion: direccionLocalDeInvitado(form), metodoPago: 'EFE', codigoCupon: null, zonaEnvioId: null,
        });
        expect(pedido.direccionEnvio).toMatchObject({ direccion: 'Av. Larco 123', ciudad: 'Miraflores', codigoPostal: '00000' });
    });
});
