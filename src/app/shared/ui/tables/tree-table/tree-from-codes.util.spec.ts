import { arbolPorPrefijoDeCodigo } from './tree-from-codes.util';

interface Cuenta { codigo: string; nombre: string; }
const c = (codigo: string): Cuenta => ({ codigo, nombre: `Cuenta ${codigo}` });
const cod = (x: Cuenta) => x.codigo;

describe('arbolPorPrefijoDeCodigo', () => {

    it('anida por prefijo como el PCGE: 1 → 10 → 101 → 1011', () => {
        const arbol = arbolPorPrefijoDeCodigo([c('1'), c('10'), c('101'), c('1011')], cod);
        expect(arbol.length).toBe(1);
        expect(arbol[0].id).toBe('1');
        expect(arbol[0].children![0].id).toBe('10');
        expect(arbol[0].children![0].children![0].id).toBe('101');
        expect(arbol[0].children![0].children![0].children![0].id).toBe('1011');
    });

    it('cuelga del prefijo MÁS LARGO, no del inmediato: con 12 y 1211 sin 121, 1211 va bajo 12', () => {
        // El plan real tiene saltos de nivel. Con la regla «un carácter menos» esta cuenta
        // desaparecería del árbol.
        const arbol = arbolPorPrefijoDeCodigo([c('1'), c('12'), c('1211')], cod);
        const doce = arbol[0].children!.find(n => n.id === '12')!;
        expect(doce.children!.map(n => n.id)).toEqual(['1211']);
    });

    it('no pierde ninguna fila: sin prefijo presente, va a la raíz', () => {
        const arbol = arbolPorPrefijoDeCodigo([c('101'), c('70')], cod);
        expect(arbol.map(n => n.id).sort()).toEqual(['101', '70']);
    });

    it('cuenta todas las filas de entrada, esté la jerarquía completa o no', () => {
        const filas = [c('1'), c('10'), c('101'), c('1011'), c('1012'), c('70'), c('7011')];
        const arbol = arbolPorPrefijoDeCodigo(filas, cod);
        let total = 0;
        const contar = (ns: typeof arbol) => ns.forEach(n => { total++; contar(n.children ?? []); });
        contar(arbol);
        expect(total).toBe(filas.length);
    });

    it('una hoja no queda con children vacío (el componente la trataría como rama)', () => {
        const arbol = arbolPorPrefijoDeCodigo([c('1'), c('10')], cod);
        const hoja = arbol[0].children![0];
        expect(hoja.children).toBeUndefined();
    });

    it('ordena por código, que en el PCGE es el orden contable', () => {
        const arbol = arbolPorPrefijoDeCodigo([c('70'), c('10'), c('12')], cod);
        expect(arbol.map(n => n.id)).toEqual(['10', '12', '70']);
    });

    it('con lista vacía devuelve un árbol vacío, sin reventar', () => {
        expect(arbolPorPrefijoDeCodigo([], cod)).toEqual([]);
    });
});
