import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { mensajeDeErrorHttp, tituloYMensajeDeError } from './http-error.util';

const err = (status: number, body: unknown = null) =>
    new HttpErrorResponse({ status, statusText: 'X', error: body });

describe('mensajeDeErrorHttp', () => {
    it('usa el texto por defecto del estado', () => {
        expect(mensajeDeErrorHttp(err(404))).toBe('El recurso solicitado no existe');
        expect(mensajeDeErrorHttp(err(0))).toBe('No se pudo conectar con el servidor');
    });

    it('el texto del dominio gana al del backend', () => {
        const e = err(409, { detail: 'unique_violation' });
        expect(mensajeDeErrorHttp(e, { 409: 'El RUC ya está registrado' })).toBe('El RUC ya está registrado');
    });

    it('sin texto del dominio, usa el detalle del backend', () => {
        expect(mensajeDeErrorHttp(err(400, { detail: 'El RUC debe tener 11 dígitos' })))
            .toBe('El RUC debe tener 11 dígitos');
    });

    it('un estado desconocido no se queda sin mensaje', () => {
        expect(mensajeDeErrorHttp(err(418))).toBe('Error 418: X');
    });
});

describe('tituloYMensajeDeError', () => {
    it('separa título y mensaje', () => {
        expect(tituloYMensajeDeError(err(403))).toEqual({
            titulo: 'Sin permiso', mensaje: 'No tienes acceso a este recurso',
        });
    });

    it('en el estado 0 ignora cualquier cuerpo: no hubo respuesta del servidor', () => {
        expect(tituloYMensajeDeError(err(0, { detail: 'basura' })).mensaje)
            .toBe('No se pudo conectar con el servidor');
    });

    it('propaga el detalle del backend cuando lo hay', () => {
        expect(tituloYMensajeDeError(err(400, { message: 'Falta el campo serie' })).mensaje)
            .toBe('Falta el campo serie');
    });

    it('un estado sin fila en la tabla no deja al usuario sin título ni mensaje', () => {
        expect(tituloYMensajeDeError(err(418))).toEqual({
            titulo: 'Error 418', mensaje: 'Ocurrió un error inesperado',
        });
    });

    it('un error de red del navegador se reporta como tal, no como estado HTTP', () => {
        const red = new HttpErrorResponse({ status: 0, error: new ErrorEvent('net', { message: 'boom' }) });
        expect(tituloYMensajeDeError(red)).toEqual({
            titulo: 'Error de red', mensaje: 'No se pudo conectar con el servidor',
        });
        expect(mensajeDeErrorHttp(red)).toBe('Error: boom');
    });

    it('messageTranslated es el último recurso antes del texto por defecto', () => {
        expect(mensajeDeErrorHttp(err(400, { messageTranslated: 'RUC inválido' }))).toBe('RUC inválido');
    });
});
