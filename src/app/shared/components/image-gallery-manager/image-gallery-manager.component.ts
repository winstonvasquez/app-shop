import {
    ChangeDetectionStrategy, Component, computed, input, output, signal,
} from '@angular/core';

/** Imagen ya guardada en el backend. */
export interface GalleryImage {
    id: number;
    url: string;
    esPrincipal: boolean;
    orden: number;
}

/** Archivo elegido en el navegador y todavía no subido. */
export interface PendingImage {
    /** Identificador local para el `track` del @for; no viaja al backend. */
    key: string;
    file: File;
    previewUrl: string;
    esPrincipal: boolean;
}

/**
 * Galería de imágenes de una entidad: admite varias, permite ordenarlas y elegir
 * cuál es la principal.
 *
 * Los binarios viven en la base de datos, así que las imágenes YA guardadas se
 * manipulan llamando al backend (el componente sólo emite la intención) y las
 * PENDIENTES se acumulan aquí hasta que la página las suba tras guardar la
 * entidad — un POST multipart necesita el id, que al crear todavía no existe.
 *
 * Uso:
 *   <app-image-gallery-manager
 *       [images]="imagenes()" [pending]="pendientes()"
 *       (filesAdded)="agregarPendientes($event)"
 *       (pendingRemoved)="quitarPendiente($event)"
 *       (pendingMainChanged)="marcarPendientePrincipal($event)"
 *       (pendingMoved)="moverPendiente($event)"
 *       (removed)="eliminarImagen($event)"
 *       (mainChanged)="marcarPrincipal($event)"
 *       (reordered)="reordenar($event)" />
 */
@Component({
    selector: 'app-image-gallery-manager',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="igm">
            <div class="igm__drop"
                 [class.igm__drop--over]="dragging()"
                 (dragover)="onDragOver($event)"
                 (dragleave)="dragging.set(false)"
                 (drop)="onDrop($event)">
                <input class="igm__file" type="file" multiple [accept]="accept()"
                       [id]="inputId" [disabled]="disabled()"
                       (change)="onPick($event)" />
                <label class="igm__pick" [attr.for]="inputId">Elegir imágenes</label>
                <p class="igm__hint">
                    Arrastra varias o selecciónalas. {{ hint() }}
                </p>
            </div>

            @if (total() > 0) {
                <ol class="igm__list">
                    @for (item of items(); track item.key) {
                        <li class="igm__item" [class.igm__item--main]="item.esPrincipal">
                            <span class="igm__pos" aria-hidden="true">{{ $index + 1 }}</span>
                            <img class="igm__thumb" [src]="item.url" [alt]="'Imagen ' + ($index + 1)" />

                            <div class="igm__meta">
                                @if (item.esPrincipal) {
                                    <span class="igm__badge">Principal</span>
                                } @else {
                                    <button type="button" class="igm__link" [disabled]="disabled()"
                                            (click)="marcarPrincipal(item)">Hacer principal</button>
                                }
                                @if (item.pendiente) {
                                    <span class="igm__pend">Sin subir</span>
                                }
                            </div>

                            <div class="igm__ctrls">
                                <button type="button" class="igm__btn" title="Subir" aria-label="Mover arriba"
                                        [disabled]="disabled() || !puedeSubir(item)" (click)="mover(item, -1)">↑</button>
                                <button type="button" class="igm__btn" title="Bajar" aria-label="Mover abajo"
                                        [disabled]="disabled() || !puedeBajar(item)" (click)="mover(item, 1)">↓</button>
                                <button type="button" class="igm__btn igm__btn--del" title="Eliminar"
                                        aria-label="Eliminar imagen"
                                        [disabled]="disabled()" (click)="eliminar(item)">✕</button>
                            </div>
                        </li>
                    }
                </ol>
                <p class="igm__note">La primera de la lista es la que se muestra por defecto si no marcas ninguna principal.</p>
            }
        </div>
    `,
    styles: [`
        .igm { display: flex; flex-direction: column; gap: 10px; }
        .igm__drop { border: 1px dashed var(--color-border, #d4d4d8); border-radius: 10px; padding: 14px;
            text-align: center; background: var(--color-surface-muted, #fafafa); }
        .igm__drop--over { border-color: var(--color-primary, #2563eb);
            background: color-mix(in srgb, var(--color-primary, #2563eb) 8%, transparent); }
        .igm__file { position: absolute; width: 1px; height: 1px; opacity: 0; }
        .igm__pick { display: inline-block; padding: 7px 14px; border-radius: 8px; cursor: pointer;
            background: var(--color-primary, #2563eb); color: #fff; font-size: 13px; }
        .igm__hint { margin: 8px 0 0; font-size: 12px; color: var(--color-text-muted, #a1a1aa); }
        .igm__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .igm__item { display: flex; align-items: center; gap: 10px; padding: 6px 8px;
            border: 1px solid var(--color-border, #e4e4e7); border-radius: 10px; background: var(--color-surface, #fff); }
        .igm__item--main { border-color: var(--color-primary, #2563eb); }
        .igm__pos { min-width: 20px; text-align: center; font-size: 12px; color: var(--color-text-muted, #a1a1aa); }
        .igm__thumb { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; background: #f4f4f5; }
        .igm__meta { flex: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; }
        .igm__badge { padding: 2px 8px; border-radius: 999px; font-size: 11px;
            background: color-mix(in srgb, var(--color-success, #16a34a) 15%, transparent);
            color: var(--color-success, #16a34a); }
        .igm__pend { padding: 2px 8px; border-radius: 999px; font-size: 11px;
            background: color-mix(in srgb, var(--color-warning, #d97706) 15%, transparent);
            color: var(--color-warning, #d97706); }
        .igm__link { border: 0; background: transparent; padding: 0; cursor: pointer; font-size: 12px;
            color: var(--color-primary, #2563eb); text-decoration: underline; }
        .igm__ctrls { display: flex; gap: 4px; }
        .igm__btn { width: 26px; height: 26px; border: 1px solid var(--color-border, #e4e4e7);
            border-radius: 6px; background: var(--color-surface, #fff); cursor: pointer; font-size: 12px; color: inherit; }
        .igm__btn:disabled { opacity: .4; cursor: not-allowed; }
        .igm__btn--del:hover:not(:disabled) { border-color: var(--color-error, #dc2626); color: var(--color-error, #dc2626); }
        .igm__note { margin: 0; font-size: 12px; color: var(--color-text-muted, #a1a1aa); }
    `],
})
export class ImageGalleryManagerComponent {
    /** Imágenes ya persistidas, en el orden que devolvió el backend. */
    readonly images = input<GalleryImage[]>([]);
    /** Archivos elegidos y aún no subidos. */
    readonly pending = input<PendingImage[]>([]);
    readonly disabled = input(false);
    readonly accept = input('image/jpeg,image/png,image/webp');
    readonly hint = input('JPG, PNG o WebP.');

    readonly filesAdded = output<File[]>();
    readonly pendingRemoved = output<PendingImage>();
    readonly pendingMainChanged = output<PendingImage>();
    /** `delta` es -1 (subir) o 1 (bajar) sobre la lista de pendientes. */
    readonly pendingMoved = output<{ item: PendingImage; delta: number }>();

    readonly removed = output<GalleryImage>();
    readonly mainChanged = output<GalleryImage>();
    /** Ids de las imágenes guardadas en su nuevo orden. */
    readonly reordered = output<number[]>();

    readonly dragging = signal(false);
    protected readonly inputId = `igm-${Math.random().toString(36).slice(2, 9)}`;

    /** Guardadas primero y pendientes al final, en una sola lista para pintar. */
    protected readonly items = computed(() => [
        ...this.images().map(img => ({
            key: `g-${img.id}`, url: img.url, esPrincipal: img.esPrincipal,
            pendiente: false, guardada: img, local: null as PendingImage | null,
        })),
        ...this.pending().map(p => ({
            key: `p-${p.key}`, url: p.previewUrl, esPrincipal: p.esPrincipal,
            pendiente: true, guardada: null as GalleryImage | null, local: p,
        })),
    ]);

    protected readonly total = computed(() => this.items().length);

    protected onPick(ev: Event): void {
        const input = ev.target as HTMLInputElement;
        this.emitirArchivos(input.files);
        // Se limpia para que volver a elegir el MISMO archivo dispare `change` otra vez.
        input.value = '';
    }

    protected onDragOver(ev: DragEvent): void {
        ev.preventDefault();
        if (!this.disabled()) this.dragging.set(true);
    }

    protected onDrop(ev: DragEvent): void {
        ev.preventDefault();
        this.dragging.set(false);
        if (!this.disabled()) this.emitirArchivos(ev.dataTransfer?.files ?? null);
    }

    private emitirArchivos(list: FileList | null): void {
        const files = Array.from(list ?? []).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) this.filesAdded.emit(files);
    }

    /** Primera de su grupo → no puede subir más. */
    protected puedeSubir(item: ReturnType<typeof this.items>[number]): boolean {
        return item.local
            ? this.pending().findIndex(p => p.key === item.local!.key) > 0
            : this.images().findIndex(i => i.id === item.guardada!.id) > 0;
    }

    /** Última de su grupo → no puede bajar más. */
    protected puedeBajar(item: ReturnType<typeof this.items>[number]): boolean {
        if (item.local) {
            const list = this.pending();
            return list.findIndex(p => p.key === item.local!.key) < list.length - 1;
        }
        const list = this.images();
        return list.findIndex(i => i.id === item.guardada!.id) < list.length - 1;
    }

    protected marcarPrincipal(item: ReturnType<typeof this.items>[number]): void {
        if (item.local) this.pendingMainChanged.emit(item.local);
        else if (item.guardada) this.mainChanged.emit(item.guardada);
    }

    protected eliminar(item: ReturnType<typeof this.items>[number]): void {
        if (item.local) this.pendingRemoved.emit(item.local);
        else if (item.guardada) this.removed.emit(item.guardada);
    }

    /**
     * Mover cruza la frontera guardadas/pendientes sólo dentro de su propio grupo:
     * una pendiente no puede colarse entre las guardadas porque todavía no tiene id
     * y el backend ordena por ids.
     */
    protected mover(item: ReturnType<typeof this.items>[number], delta: number): void {
        if (item.local) {
            this.pendingMoved.emit({ item: item.local, delta });
            return;
        }
        const ids = this.images().map(i => i.id);
        const from = ids.indexOf(item.guardada!.id);
        const to = from + delta;
        if (from < 0 || to < 0 || to >= ids.length) return;
        [ids[from], ids[to]] = [ids[to], ids[from]];
        this.reordered.emit(ids);
    }
}
