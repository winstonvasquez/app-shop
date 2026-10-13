import { describe, expect, it } from 'vitest';
import { cabeceraInvitado, GUEST_TOKEN_HEADER } from './guest-session.service';

describe('cabeceraInvitado', () => {
    it('manda X-Guest-Token sólo sin sesión y con token', () => {
        expect(cabeceraInvitado('abc', false)).toEqual({ [GUEST_TOKEN_HEADER]: 'abc' });
    });

    it('con sesión o sin token no manda nada', () => {
        expect(cabeceraInvitado('abc', true)).toBeUndefined();
        expect(cabeceraInvitado(null, false)).toBeUndefined();
        expect(cabeceraInvitado('', false)).toBeUndefined();
    });
});
