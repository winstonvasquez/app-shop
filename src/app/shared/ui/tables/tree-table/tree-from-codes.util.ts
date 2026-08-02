import { TreeNode } from './tree-table.component';

/**
 * Arma un árbol a partir de una lista PLANA cuyo código codifica la jerarquía por prefijo, que es
 * exactamente cómo funciona el PCGE peruano: `1` → `10` → `101` → `1011`.
 *
 * Reglas, y el porqué de cada una:
 * - El padre de un código es el elemento de la lista con el prefijo propio MÁS LARGO. Buscar «un
 *   carácter menos» no vale: el plan real tiene saltos de nivel (existe `12` y `1211` sin que
 *   exista `121` en algunas empresas), y con esa regla la cuenta huérfana desaparecería del árbol.
 * - Un elemento sin ningún prefijo presente en la lista se emite como RAÍZ. Así ninguna fila se
 *   pierde por venir incompleta — es preferible verla en la raíz que no verla.
 * - El orden se preserva por código, que en el PCGE ya es el orden contable natural.
 */
export function arbolPorPrefijoDeCodigo<T>(
    filas: readonly T[],
    codigoDe: (fila: T) => string,
): TreeNode<T>[] {
    const ordenadas = [...filas].sort((a, b) => codigoDe(a).localeCompare(codigoDe(b), 'es'));
    const nodos = new Map<string, TreeNode<T>>();
    const raices: TreeNode<T>[] = [];

    for (const fila of ordenadas) {
        const codigo = codigoDe(fila);
        const nodo: TreeNode<T> = { id: codigo, data: fila, children: [] };
        nodos.set(codigo, nodo);

        // Prefijo propio más largo que exista ya en el mapa.
        let padre: TreeNode<T> | undefined;
        for (let corte = codigo.length - 1; corte >= 1; corte--) {
            const candidato = nodos.get(codigo.slice(0, corte));
            if (candidato) { padre = candidato; break; }
        }

        if (padre) padre.children!.push(nodo);
        else raices.push(nodo);
    }

    // `children: []` en una hoja haría que el componente la tratara como rama: se normaliza.
    const limpiar = (lista: TreeNode<T>[]): void => {
        for (const n of lista) {
            if (n.children && n.children.length === 0) delete n.children;
            else if (n.children) limpiar(n.children);
        }
    };
    limpiar(raices);

    return raices;
}
