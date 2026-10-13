import { describe, expect, it } from 'vitest';
import { mensajeDeErrorDeFacebook } from './facebook-error.util';

const SDK = 'El SDK de Facebook no está listo todavía. Intenta de nuevo en unos segundos.';
const APP_ID = 'El App ID de Facebook no está configurado. Revisa environment.ts.';
const HTTPS = 'Facebook requiere HTTPS. Activa SSL en tu servidor de desarrollo.';
const GENERICO = 'Error al abrir el inicio de sesión con Facebook.';

describe('mensajeDeErrorDeFacebook', () => {
    it.each(['FB.init has not been called', 'called before init', 'FB not initialized'])(
        'reconoce el SDK no inicializado en «%s»', msg => {
            expect(mensajeDeErrorDeFacebook(msg)).toBe(SDK);
        });

    it.each(['Invalid Facebook App Id', 'App Id is missing'])(
        'reconoce el App ID sin configurar en «%s»', msg => {
            expect(mensajeDeErrorDeFacebook(msg)).toBe(APP_ID);
        });

    it('reconoce el requisito de HTTPS por la mención a http', () => {
        expect(mensajeDeErrorDeFacebook('must use https protocol')).toBe(HTTPS);
        expect(mensajeDeErrorDeFacebook('http is not allowed')).toBe(HTTPS);
    });

    it('el orden manda: un mensaje que encaja en dos reglas se queda con la primera', () => {
        expect(mensajeDeErrorDeFacebook('App Id must be set before FB.init')).toBe(SDK);
        expect(mensajeDeErrorDeFacebook('App Id invalid over http')).toBe(APP_ID);
    });

    it('un error desconocido se muestra tal cual, sin traducir', () => {
        expect(mensajeDeErrorDeFacebook('User cancelled the dialog')).toBe('User cancelled the dialog');
    });

    it('un mensaje vacío cae al texto genérico: nunca un modal en blanco', () => {
        expect(mensajeDeErrorDeFacebook('')).toBe(GENERICO);
    });
});
