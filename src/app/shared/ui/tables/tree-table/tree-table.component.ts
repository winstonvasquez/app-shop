import {
    ChangeDetectionStrategy, Component, computed, input, output, signal,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TableColumn } from '../data-table/data-table.component';

/**
 * Tabla jerárquica (tree view) para los catálogos del ERP que SON un árbol de verdad: el plan
 * contable PCGE, los estados financieros por agrupación de cuentas, y cualquier maestro con
 * padre/hijo.
 *
 * Adaptación de una idea de un componente React/shadcn (`AiConversationTree`) al stack real de este
 * repo: Angular 21 standalone + signals + tokens de «Confianza». Lo que se conserva de la idea es
 * lo que aportaba: el chevron que rota, la **guía vertical** que hace legible la profundidad, el
 * contador de descendientes por nodo y el resumen en la cabecera. Lo que NO se conserva: React,
 * `class-variance-authority`, `cn()`, `data-slot`, los colores crudos de Tailwind (`bg-cyan-100`,
 * `dark:bg-cyan-950`…) y el `Context` — aquí las columnas se declaran con el MISMO `TableColumn`
 * que ya usa `app-data-table`, para no inventar un segundo contrato de tabla en el proyecto.
 *
 * Deliberadamente NO pagina: un árbol paginado muestra nodos huérfanos (hijos cuyo padre cayó en
 * otra página), que es peor que no tener árbol. Quien lo use debe cargar el conjunto completo — y
 * si el conjunto no cabe, la vista correcta es la tabla plana, no este componente.
 */

/** Nodo del árbol. `children` vacío o ausente = hoja. */
export interface TreeNode<T = unknown> {
    /** Identificador estable; es la clave del `track` y del estado de expansión. */
    id: string;
    /** La fila original, que es lo que reciben los `render()` de las columnas. */
    data: T;
    children?: TreeNode<T>[];
}

/** Fila ya aplanada para pintar: el árbol se recorre una vez y se emite lo visible. */
interface FilaVisible<T> {
    node: TreeNode<T>;
    depth: number;
    hasChildren: boolean;
    expanded: boolean;
    descendientes: number;
}

@Component({
    selector: 'app-tree-table',
    standalone: true,
    imports: [LucideAngularModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="tree-table">
      @if (title()) {
        <div class="tree-table-header">
          <span class="tree-table-title">{{ title() }}</span>
          <span class="badge badge-neutral">
            {{ totalNodos() }} {{ totalNodos() === 1 ? unidadSingular() : unidadPlural() }}
            @if (totalRamas() > 0) { · {{ totalRamas() }} con desglose }
          </span>
          <span class="tree-table-spacer"></span>
          <button type="button" class="tree-table-toggle-all" (click)="alternarTodo()">
            <!-- Sólo iconos ya registrados en el proveedor de lucide de app.config.ts: uno sin
                 registrar no pinta nada y tampoco da error, ya pasó tres veces en este repo.
                 (Sin comillas invertidas aquí: el template es un template literal y las rompe.) -->
            <lucide-icon [name]="todoExpandido() ? 'chevron-up' : 'chevron-down'" [size]="14" />
            {{ todoExpandido() ? 'Contraer todo' : 'Expandir todo' }}
          </button>
        </div>
      }

      <div class="tree-table-scroll">
        <table class="table">
          <thead>
            <tr>
              @for (col of columns(); track col.key) {
                <th class="table-header-cell"
                    [style.width]="col.width || null"
                    [style.text-align]="col.align || 'left'">{{ col.label }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (fila of filasVisibles(); track fila.node.id) {
              <tr class="table-row"
                  [class.tree-row-branch]="fila.hasChildren"
                  [attr.aria-level]="fila.depth + 1"
                  [attr.aria-expanded]="fila.hasChildren ? fila.expanded : null">
                @for (col of columns(); track col.key; let primera = $first) {
                  <td class="table-cell" [style.text-align]="col.align || 'left'">
                    @if (primera) {
                      <!-- La primera columna lleva la sangría, la guía y el control de expansión. -->
                      <span class="tree-cell" [style.padding-inline-start.px]="fila.depth * 20">
                        @if (fila.depth > 0) {
                          <span class="tree-guide" aria-hidden="true"></span>
                        }
                        @if (fila.hasChildren) {
                          <button type="button" class="tree-chevron"
                                  [class.tree-chevron-open]="fila.expanded"
                                  (click)="alternar(fila.node.id, $event)"
                                  [attr.aria-label]="(fila.expanded ? 'Contraer ' : 'Expandir ') + textoDe(col, fila.node)">
                            <lucide-icon name="chevron-right" [size]="14" />
                          </button>
                        } @else {
                          <span class="tree-chevron-hueco" aria-hidden="true"></span>
                        }
                        <span class="tree-etiqueta" [class.tree-etiqueta-rama]="fila.hasChildren">
                          {{ textoDe(col, fila.node) }}
                        </span>
                        @if (fila.hasChildren && !fila.expanded) {
                          <span class="badge badge-neutral tree-contador">{{ fila.descendientes }}</span>
                        }
                      </span>
                    } @else if (col.html) {
                      <span [innerHTML]="textoDe(col, fila.node)"></span>
                    } @else {
                      {{ textoDe(col, fila.node) }}
                    }
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td class="table-cell tree-vacio" [attr.colspan]="columns().length">
                  {{ emptyMessage() }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
    styles: [`
    .tree-table {
      border: 1px solid var(--color-border);
      border-radius: 12px;
      background: var(--color-surface);
      overflow: hidden;
    }

    .tree-table-header {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--color-border);
    }
    .tree-table-title { font-weight: 700; font-size: 0.92rem; color: var(--color-text-on); }
    .tree-table-spacer { flex: 1; }

    .tree-table-toggle-all {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 0.78rem; font-weight: 600;
      color: var(--color-primary);
      background: none; border: none; cursor: pointer;
      padding: 4px 8px; border-radius: 8px;
    }
    .tree-table-toggle-all:hover { background: var(--color-background); }

    /* El desbordamiento horizontal se queda DENTRO del contenedor: la página nunca scrollea en
       horizontal (convención del proyecto). */
    .tree-table-scroll { overflow-x: auto; }

    .tree-cell {
      position: relative;
      display: inline-flex; align-items: center; gap: 6px;
      min-height: 24px;
    }

    /* Guía vertical que hace legible la profundidad — es lo que más aporta de la idea original. */
    .tree-guide {
      position: absolute;
      left: -10px; top: -10px; bottom: -10px;
      width: 1px;
      background: var(--color-border);
    }

    .tree-chevron {
      display: inline-flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; flex: 0 0 20px;
      border: none; background: none; cursor: pointer;
      border-radius: 6px;
      color: var(--color-text-subtle);
      transition: transform 160ms ease, background-color 160ms ease;
    }
    .tree-chevron:hover { background: var(--color-background); }
    .tree-chevron-open { transform: rotate(90deg); }
    .tree-chevron-hueco { display: inline-block; width: 20px; flex: 0 0 20px; }

    .tree-etiqueta-rama { font-weight: 600; }
    .tree-contador { font-size: 0.68rem; }

    .tree-row-branch > .table-cell { background: color-mix(in oklch, var(--color-background) 55%, transparent); }

    .tree-vacio { text-align: center; padding: 28px 12px; color: var(--color-text-subtle); }
  `],
})
export class TreeTableComponent<T> {
    /** Raíces del árbol. */
    nodes = input.required<TreeNode<T>[]>();
    /** Mismas columnas que `app-data-table`: la PRIMERA lleva la jerarquía. */
    columns = input.required<TableColumn<T>[]>();
    title = input<string>('');
    /** Cómo nombrar los nodos en el resumen de la cabecera. */
    unidadSingular = input<string>('elemento');
    unidadPlural = input<string>('elementos');
    emptyMessage = input<string>('No hay datos disponibles');
    /** Profundidad expandida al montar. 1 = sólo las raíces desplegadas. */
    defaultExpandedDepth = input<number>(1);

    rowClick = output<T>();

    /** Ids contraídos. Se guarda lo CONTRAÍDO y no lo expandido para que un árbol que llega más
     *  tarde (carga asíncrona) aparezca desplegado según `defaultExpandedDepth` sin repoblar nada. */
    private readonly contraidos = signal<ReadonlySet<string>>(new Set());
    private readonly expandidosManualmente = signal<ReadonlySet<string>>(new Set());

    /** Filas visibles, aplanadas en un solo recorrido. */
    readonly filasVisibles = computed<FilaVisible<T>[]>(() => {
        const contraidos = this.contraidos();
        const expandidos = this.expandidosManualmente();
        const profundidadPorDefecto = this.defaultExpandedDepth();
        const salida: FilaVisible<T>[] = [];

        const estaExpandido = (id: string, depth: number): boolean => {
            if (contraidos.has(id)) return false;
            if (expandidos.has(id)) return true;
            return depth + 1 < profundidadPorDefecto;
        };

        const recorrer = (nodos: TreeNode<T>[], depth: number): void => {
            for (const node of nodos) {
                const hijos = node.children ?? [];
                const hasChildren = hijos.length > 0;
                const expanded = hasChildren && estaExpandido(node.id, depth);
                salida.push({
                    node, depth, hasChildren, expanded,
                    descendientes: hasChildren ? this.contarDescendientes(node) : 0,
                });
                if (expanded) recorrer(hijos, depth + 1);
            }
        };

        recorrer(this.nodes(), 0);
        return salida;
    });

    readonly totalNodos = computed(() => {
        let n = 0;
        const recorrer = (nodos: TreeNode<T>[]) => {
            for (const nodo of nodos) { n++; recorrer(nodo.children ?? []); }
        };
        recorrer(this.nodes());
        return n;
    });

    readonly totalRamas = computed(() => {
        let n = 0;
        const recorrer = (nodos: TreeNode<T>[]) => {
            for (const nodo of nodos) {
                if ((nodo.children?.length ?? 0) > 0) n++;
                recorrer(nodo.children ?? []);
            }
        };
        recorrer(this.nodes());
        return n;
    });

    readonly todoExpandido = computed(() =>
        this.filasVisibles().every(f => !f.hasChildren || f.expanded));

    alternar(id: string, ev: Event): void {
        ev.stopPropagation();
        const contraidos = new Set(this.contraidos());
        const expandidos = new Set(this.expandidosManualmente());
        const estaVisible = this.filasVisibles().find(f => f.node.id === id)?.expanded ?? false;
        if (estaVisible) { contraidos.add(id); expandidos.delete(id); }
        else { contraidos.delete(id); expandidos.add(id); }
        this.contraidos.set(contraidos);
        this.expandidosManualmente.set(expandidos);
    }

    alternarTodo(): void {
        if (this.todoExpandido()) {
            // Contraer todo: se marcan todas las ramas como contraídas.
            const todas = new Set<string>();
            const recorrer = (nodos: TreeNode<T>[]) => {
                for (const nodo of nodos) {
                    if ((nodo.children?.length ?? 0) > 0) todas.add(nodo.id);
                    recorrer(nodo.children ?? []);
                }
            };
            recorrer(this.nodes());
            this.contraidos.set(todas);
            this.expandidosManualmente.set(new Set());
        } else {
            const todas = new Set<string>();
            const recorrer = (nodos: TreeNode<T>[]) => {
                for (const nodo of nodos) {
                    if ((nodo.children?.length ?? 0) > 0) todas.add(nodo.id);
                    recorrer(nodo.children ?? []);
                }
            };
            recorrer(this.nodes());
            this.contraidos.set(new Set());
            this.expandidosManualmente.set(todas);
        }
    }

    /** Valor de una celda: usa el `render()` de la columna si lo hay, como el data-table. */
    textoDe(col: TableColumn<T>, node: TreeNode<T>): string {
        if (col.render) return col.render(node.data);
        const valor = (node.data as Record<string, unknown>)?.[col.key];
        return valor === null || valor === undefined ? '' : String(valor);
    }

    private contarDescendientes(node: TreeNode<T>): number {
        let n = 0;
        const recorrer = (nodos: TreeNode<T>[]) => {
            for (const hijo of nodos) { n++; recorrer(hijo.children ?? []); }
        };
        recorrer(node.children ?? []);
        return n;
    }
}
