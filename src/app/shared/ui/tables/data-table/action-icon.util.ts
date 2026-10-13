/**
 * Resolución del icono y la clase CSS de un botón de acción de la tabla.
 *
 * Estaba escrito como dos cadenas de `if` dentro del componente —13 ramas entre las dos— y por
 * vivir ahí era imposible de cubrir sin `TestBed`, así que su CRAP era 210 con cobertura 0. Es
 * lógica que sólo depende de dos cadenas de texto: sacada aquí se cubre con vitest a secas.
 *
 * Las claves son los iconos que los ~60 listados del ERP pasan en `TableAction.icon`, en las tres
 * formas que conviven: el emoji con selector de variación (`✏️`), el emoji sin él (`✏`) y el nombre
 * en inglés (`edit`). Añadir un icono nuevo es añadir una fila, no una rama.
 */
export type TipoDeIcono = 'edit' | 'delete' | 'view' | 'check' | 'x' | 'pin' | 'text';

const POR_ICONO: ReadonlyMap<string, TipoDeIcono> = new Map(([
    [['✏️', '✏', 'edit'], 'edit'],
    [['🗑️', '🗑', 'trash', 'delete'], 'delete'],
    [['👁️', '👁', 'view'], 'view'],
    [['✓', '✔️', '✔', 'check', 'approve'], 'check'],
    [['✗', '✕', 'x', 'close', '🚫', 'ban', 'reject'], 'x'],
    [['📍', 'pin', 'location'], 'pin'],
] as [string[], TipoDeIcono][]).flatMap(([iconos, tipo]) => iconos.map((i) => [i, tipo] as const)));

/** Tipo canónico del icono, para elegir qué SVG pinta la plantilla. */
export function tipoDeIcono(icono: string): TipoDeIcono {
    return POR_ICONO.get(icono.trim()) ?? 'text';
}

/**
 * Clase del botón. `check` reusa el estilo de editar y `x` el de borrar a propósito: son acciones
 * afirmativas y destructivas respectivamente, y el ERP sólo tiene esos dos colores de acción.
 */
const CLASE_POR_TIPO: Readonly<Record<TipoDeIcono, string>> = {
    edit: 'btn-icon-edit',
    delete: 'btn-icon-delete',
    view: 'btn-view',
    check: 'btn-icon-edit',
    x: 'btn-icon-delete',
    pin: 'btn-view',
    text: '',
};

/** Una clase explícita en la acción manda sobre el icono; se busca en este orden. */
const CLASES_EXPLICITAS: readonly (readonly [string, string])[] = [
    ['btn-icon-edit', 'btn-icon-edit'],
    ['btn-icon-delete', 'btn-icon-delete'],
    ['btn-view', 'btn-view'],
    ['btn-delete', 'btn-icon-delete'],
    ['btn-edit', 'btn-icon-edit'],
];

export function claseDeBotonDeAccion(clase: string | undefined, icono: string | undefined): string {
    const cls = clase ?? '';
    const explicita = CLASES_EXPLICITAS.find(([marca]) => cls.includes(marca));
    if (explicita) return `btn-icon ${explicita[1]}`;

    const propia = CLASE_POR_TIPO[tipoDeIcono(icono ?? '')];
    // Sin icono reconocible se conserva la clase que trajera la acción, que es lo que hacía antes.
    return propia ? `btn-icon ${propia}` : `btn-icon ${cls}`.trim();
}
