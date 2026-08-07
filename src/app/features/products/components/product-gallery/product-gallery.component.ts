import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ProductDetail } from '@features/products/models/product-detail.model';
import { Image as ProductImage } from '@features/products/models/image.model';

export interface GalleryMediaItem {
  id: number;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string;
  /** Etiqueta accesible: "Imagen 2 de 5" / "Video del producto". Nada inventado. */
  label: string;
}

/**
 * Galería de la página de producto: visor principal + tira de miniaturas.
 *
 * Sustituye a `product-curved-gallery` (retirada 2026-08-02), una maqueta oscura con
 * carrusel en arco que además prometía lo que no tenía: de sus 7 botones de rail sólo
 * uno hacía algo, tres iconos de acción no tenían `(click)`, la barra inferior simulaba
 * wifi y ajustes inexistentes, la fecha "22 de Agosto 2026" estaba hardcodeada, el
 * contador decía "Fotos / Media HD" contando el video como foto, y un producto sin
 * `videoUrl` ofrecía un video de muestra de Google como demo del producto. Nueve de sus
 * diecisiete iconos lucide no estaban registrados, así que fallaban sólo en runtime.
 */
@Component({
  selector: 'app-product-gallery',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './product-gallery.component.html',
  styleUrl: './product-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onDocumentKeydown($event)' }
})
export class ProductGalleryComponent {
  product = input.required<ProductDetail>();

  readonly selectedIndex = signal<number>(0);
  readonly isPlayingVideo = signal<boolean>(false);
  readonly lightboxOpen = signal<boolean>(false);

  /** URLs que no cargaron — se pintan como marco vacío, no como icono roto. */
  private readonly failedUrls = signal<ReadonlySet<string>>(new Set<string>());

  /** Imágenes propias del producto, la primaria primero. */
  private readonly ownImages = computed<ProductImage[]>(() => {
    const imgs = this.product()?.images ?? [];
    const valid = imgs.filter(img => !!img?.url?.trim());
    return [...valid].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  });

  /**
   * Video sólo si el producto realmente tiene uno. Sin fallback ajeno.
   * ponytail: `videoUrl` no existe todavía en microshopventas (ni columna ni DTO), así que hoy
   * siempre es false. Se conserva la rama porque el día que el backend lo persista funciona sin
   * tocar nada; ver la nota en `product-detail.model.ts`.
   */
  readonly hasVideo = computed<boolean>(() => !!this.product()?.videoUrl?.trim());

  readonly mediaItems = computed<GalleryMediaItem[]>(() => {
    const p = this.product();
    if (!p) return [];

    const urls = this.ownImages().map(img => img.url);

    const items: GalleryMediaItem[] = urls.map((url, idx) => ({
      id: idx + 1,
      type: 'image' as const,
      url,
      thumbnailUrl: url,
      label: `Imagen ${idx + 1} de ${urls.length}`
    }));

    if (this.hasVideo()) {
      items.push({
        id: items.length + 1,
        type: 'video',
        url: p.videoUrl!,
        thumbnailUrl: urls[0] ?? '',
        label: 'Video del producto'
      });
    }

    return items;
  });

  readonly activeItem = computed<GalleryMediaItem | null>(() => {
    const items = this.mediaItems();
    if (!items.length) return null;
    return items[this.safeIndex()] ?? null;
  });

  /** Contador del visor: "2 / 4" para imágenes, "Video" para el video. */
  readonly positionLabel = computed<string>(() => {
    const active = this.activeItem();
    if (!active) return '';
    if (active.type === 'video') return 'Video';
    const total = this.mediaItems().filter(i => i.type === 'image').length;
    return `${this.safeIndex() + 1} / ${total}`;
  });

  hasFailed(url: string): boolean {
    return this.failedUrls().has(url);
  }

  onImageError(url: string): void {
    this.failedUrls.update(set => new Set(set).add(url));
  }

  private safeIndex(): number {
    const len = this.mediaItems().length;
    if (!len) return 0;
    return Math.min(Math.max(0, this.selectedIndex()), len - 1);
  }

  selectItem(index: number): void {
    const len = this.mediaItems().length;
    if (!len) return;
    const next = Math.min(Math.max(0, index), len - 1);
    this.selectedIndex.set(next);
    if (this.mediaItems()[next]?.type !== 'video') {
      this.isPlayingVideo.set(false);
    }
  }

  /** Navegación circular: desde el último se vuelve al primero. */
  step(delta: number): void {
    const len = this.mediaItems().length;
    if (!len) return;
    this.selectItem((this.safeIndex() + delta + len) % len);
  }

  playVideo(): void {
    if (!this.hasVideo()) return;
    const videoIdx = this.mediaItems().findIndex(i => i.type === 'video');
    if (videoIdx < 0) return;
    this.selectedIndex.set(videoIdx);
    this.isPlayingVideo.set(true);
  }

  openLightbox(): void {
    if (!this.activeItem()) return;
    this.lightboxOpen.set(true);
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
  }

  /** Flechas, Inicio y Fin sobre la tira de miniaturas. */
  onGalleryKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        this.step(1); break;
      case 'ArrowLeft':
      case 'ArrowUp':
        this.step(-1); break;
      case 'Home':
        this.selectItem(0); break;
      case 'End':
        this.selectItem(this.mediaItems().length - 1); break;
      default:
        return;
    }
    event.preventDefault();
  }

  /**
   * Escape cierra el visor a pantalla completa; las flechas siguen navegando.
   * Va en `document` y no en el overlay porque al abrirse nadie le da el foco: con el handler
   * en el div, Escape no hacía nada salvo que el usuario tabulara hasta él.
   * ponytail: sin trampa de foco — añadir `cdkTrapFocus` si el visor crece en controles.
   */
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.lightboxOpen()) return;
    if (event.key === 'Escape') {
      this.closeLightbox();
      event.preventDefault();
      return;
    }
    this.onGalleryKeydown(event);
  }
}
