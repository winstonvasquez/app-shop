import { describe, expect, it } from 'vitest';
import { armarPackingBody } from './packing-page.form';

describe('armarPackingBody', () => {
    it('omite vacíos y conserva medidas válidas', () => {
        expect(armarPackingBody({
            pickingOrderId: 'p1', packageType: '', weight: 2.5, length: null, width: null, height: 0, notes: ''
        })).toEqual({
            pickingOrderId: 'p1', packageType: undefined, weight: 2.5,
            length: undefined, width: undefined, height: undefined, notes: undefined
        });
    });
});
