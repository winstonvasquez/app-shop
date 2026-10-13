import { describe, expect, it } from 'vitest';
import { aplanarArbol, contarDescendientes, idsDeRamas } from './tree-walk.util';
import { TreeNode } from './tree-table.component';

/** Nodo de prueba. Sin `children` = hoja; con `[]` = hoja mal normalizada (caso real del PCGE). */
const n = (id: string, children?: TreeNode<string>[]): TreeNode<string> =>
    children === undefined ? { id, data: id } : { id, data: id, children };

/** 1 → (10 → (101 → 1011), 12), 70 → 7011 */
const ARBOL: TreeNode<string>[] = [
    n('1', [n('10', [n('101', [n('1011')])]), n('12')]),
    n('70', [n('7011')]),
];

const SIN = new Set<string>();
const ids = (filas: { node: TreeNode<string> }[]) => filas.map(f => f.node.id);

describe('idsDeRamas', () => {
    it('devuelve sólo los nodos con hijos, a cualquier profundidad', () => {
        expect([...idsDeRamas(ARBOL)].sort()).toEqual(['1', '10', '101', '70']);
    });

    it('una hoja con `children: []` NO es rama', () => {
        expect(idsDeRamas([n('a', []), n('b')])).toEqual(SIN);
    });

    it('con un árbol vacío devuelve un conjunto vacío, sin reventar', () => {
        expect(idsDeRamas([]).size).toBe(0);
    });
});

describe('contarDescendientes', () => {
    it('cuenta todos los niveles, no sólo los hijos directos', () => {
        expect(contarDescendientes(ARBOL[0])).toBe(4);   // 10, 101, 1011, 12
    });

    it('una hoja tiene 0 descendientes (sin `children` y con `children: []`)', () => {
        expect(contarDescendientes(n('x'))).toBe(0);
        expect(contarDescendientes(n('x', []))).toBe(0);
    });
});

describe('aplanarArbol', () => {
    it('con profundidad 1 sólo se ven las raíces', () => {
        expect(ids(aplanarArbol(ARBOL, SIN, SIN, 1))).toEqual(['1', '70']);
    });

    it('con profundidad 2 se ven las raíces y sus hijos directos', () => {
        expect(ids(aplanarArbol(ARBOL, SIN, SIN, 2))).toEqual(['1', '10', '12', '70', '7011']);
    });

    it('con profundidad 0 tampoco se pierde ninguna raíz: se ven, pero contraídas', () => {
        const filas = aplanarArbol(ARBOL, SIN, SIN, 0);
        expect(ids(filas)).toEqual(['1', '70']);
        expect(filas.every(f => !f.expanded)).toBe(true);
    });

    it('lo expandido a mano abre una rama por debajo de la profundidad por defecto', () => {
        expect(ids(aplanarArbol(ARBOL, SIN, new Set(['1', '10']), 1)))
            .toEqual(['1', '10', '101', '12', '70']);
    });

    it('lo contraído a mano GANA sobre lo expandido a mano en el mismo id', () => {
        expect(ids(aplanarArbol(ARBOL, new Set(['1']), new Set(['1']), 3))).toEqual(['1', '70', '7011']);
    });

    it('lo contraído a mano gana también sobre la profundidad por defecto', () => {
        expect(ids(aplanarArbol(ARBOL, new Set(['1']), SIN, 2))).toEqual(['1', '70', '7011']);
    });

    it('los hijos de un nodo contraído no se emiten (no es un ocultar por CSS)', () => {
        const filas = aplanarArbol(ARBOL, new Set(['10']), SIN, 9);
        expect(ids(filas)).toEqual(['1', '10', '12', '70', '7011']);
        expect(filas.find(f => f.node.id === '10')!.expanded).toBe(false);
    });

    it('marca profundidad, rama y descendientes de cada fila', () => {
        const filas = aplanarArbol(ARBOL, SIN, SIN, 2);
        const raiz = filas[0];
        expect(raiz).toMatchObject({ depth: 0, hasChildren: true, expanded: true, descendientes: 4 });
        const hoja = filas.find(f => f.node.id === '12')!;
        expect(hoja).toMatchObject({ depth: 1, hasChildren: false, expanded: false, descendientes: 0 });
    });

    it('una rama contraída conserva su contador de descendientes (es lo que pinta el badge)', () => {
        const filas = aplanarArbol(ARBOL, new Set(['1']), SIN, 5);
        expect(filas[0]).toMatchObject({ hasChildren: true, expanded: false, descendientes: 4 });
    });

    it('una hoja con `children: []` nunca sale expandida ni como rama', () => {
        const filas = aplanarArbol([n('a', [])], SIN, new Set(['a']), 9);
        expect(filas[0]).toMatchObject({ hasChildren: false, expanded: false, descendientes: 0 });
    });

    it('con un árbol vacío devuelve una lista vacía', () => {
        expect(aplanarArbol([], SIN, SIN, 3)).toEqual([]);
    });
});
