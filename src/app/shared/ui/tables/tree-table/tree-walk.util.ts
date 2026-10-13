import { TreeNode } from './tree-table.component';

/** Fila ya aplanada para pintar: el árbol se recorre una vez y se emite lo visible. */
export interface FilaVisible<T> {
    node: TreeNode<T>;
    depth: number;
    hasChildren: boolean;
    expanded: boolean;
    descendientes: number;
}

/**
 * Ids de todos los nodos que SON rama (tienen al menos un hijo), a cualquier profundidad.
 *
 * Es el conjunto sobre el que operan «expandir todo» y «contraer todo»: una hoja no tiene estado
 * de expansión, así que meterla en el conjunto sólo ensucia el estado y hace que el componente
 * crea que hay algo que desplegar.
 */
export function idsDeRamas<T>(nodos: readonly TreeNode<T>[]): Set<string> {
    const ramas = new Set<string>();
    const recorrer = (lista: readonly TreeNode<T>[]): void => {
        for (const nodo of lista) {
            const hijos = nodo.children ?? [];
            if (hijos.length > 0) ramas.add(nodo.id);
            recorrer(hijos);
        }
    };
    recorrer(nodos);
    return ramas;
}

/** Cuántos nodos cuelgan de éste, contando todos los niveles (no sólo los hijos directos). */
export function contarDescendientes<T>(node: TreeNode<T>): number {
    let n = 0;
    const recorrer = (nodos: readonly TreeNode<T>[]): void => {
        for (const hijo of nodos) { n++; recorrer(hijo.children ?? []); }
    };
    recorrer(node.children ?? []);
    return n;
}

/**
 * Aplana el árbol a la lista de filas VISIBLES, en el orden en que se pintan.
 *
 * La regla de expansión tiene tres capas y el orden entre ellas es lo que importa: lo contraído a
 * mano gana sobre lo expandido a mano, y ambos ganan sobre `profundidadPorDefecto`. Guardar lo
 * CONTRAÍDO (y no sólo lo expandido) es lo que permite que un árbol que llega por carga asíncrona
 * aparezca ya desplegado hasta la profundidad por defecto sin repoblar ningún estado.
 *
 * `profundidadPorDefecto` se cuenta en niveles visibles: 1 = sólo las raíces desplegadas.
 * Los hijos de un nodo contraído no se emiten: no están en la lista, no sólo ocultos por CSS.
 */
export function aplanarArbol<T>(
    nodos: readonly TreeNode<T>[],
    contraidos: ReadonlySet<string>,
    expandidos: ReadonlySet<string>,
    profundidadPorDefecto: number,
): FilaVisible<T>[] {
    const salida: FilaVisible<T>[] = [];

    const estaExpandido = (id: string, depth: number): boolean => {
        if (contraidos.has(id)) return false;
        if (expandidos.has(id)) return true;
        return depth + 1 < profundidadPorDefecto;
    };

    const recorrer = (lista: readonly TreeNode<T>[], depth: number): void => {
        for (const node of lista) {
            const hijos = node.children ?? [];
            const hasChildren = hijos.length > 0;
            const expanded = hasChildren && estaExpandido(node.id, depth);
            salida.push({
                node, depth, hasChildren, expanded,
                descendientes: hasChildren ? contarDescendientes(node) : 0,
            });
            if (expanded) recorrer(hijos, depth + 1);
        }
    };

    recorrer(nodos, 0);
    return salida;
}
