import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';

/**
 * Selector de imagen para los formularios del ERP.
 *
 * Las imágenes del sistema se guardan como binario en la base de datos, no como
 * URL externa: este componente solo elige y previsualiza el archivo; el POST
 * multipart lo hace la página después de guardar la entidad (necesita el id).
 *
 * Uso:
 *   <app-image-upload label="Imagen de la categoría"
 *                     [currentUrl]="categoria()?.imagenUrl"
 *                     (fileSelected)="archivo.set($event)"
 *                     (cleared)="archivo.set(null)" />
 */
@Component({
    selector: 'app-image-upload',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (label()) {
            <label class="input-label" [attr.for]="inputId">{{ label() }}</label>
        }

        <div class="iu-box"
             [class.iu-dragging]="dragging()"
             [class.iu-disabled]="disabled()"
             (dragover)="onDragOver($event)"
             (dragleave)="dragging.set(false)"
             (drop)="onDrop($event)">

            @if (previewUrl()) {
                <img class="iu-preview" [src]="previewUrl()" [alt]="label() || 'Imagen'" />
            } @else {
                <div class="iu-placeholder" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <circle cx="8.5" cy="9.5" r="1.5" />
                        <path d="M21 16l-5-5-4 4-2-2-7 7" />
                    </svg>
                </div>
            }

            <div class="iu-actions">
                <input class="iu-file" type="file" [id]="inputId" [accept]="accept()"
                       [disabled]="disabled()" (change)="onFileInput($event)" />
                <label class="btn btn-secondary btn-sm" [attr.for]="inputId">
                    {{ previewUrl() ? 'Cambiar imagen' : 'Elegir imagen' }}
                </label>
                @if (previewUrl()) {
                    <button type="button" class="btn btn-ghost btn-sm" [disabled]="disabled()" (click)="limpiar()">
                        Quitar
                    </button>
                }
                <span class="iu-hint">{{ hint() }}</span>
            </div>
        </div>

        @if (error()) {
            <span class="iu-error">{{ error() }}</span>
        }
    `,
    styles: [`
:host { display: block; }

.iu-box {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px;
    border: 1px dashed var(--color-border);
    border-radius: 10px;
    background: var(--color-surface);
    transition: border-color .15s ease, background .15s ease;
}
.iu-box.iu-dragging { border-color: var(--color-primary); background: color-mix(in oklch, var(--color-primary) 6%, transparent); }
.iu-box.iu-disabled { opacity: .6; pointer-events: none; }

.iu-preview {
    width: 96px; height: 96px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-raised);
    flex-shrink: 0;
}
.iu-placeholder {
    width: 96px; height: 96px;
    display: grid; place-items: center;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-raised);
    color: var(--color-text-muted);
    flex-shrink: 0;
}
.iu-placeholder svg { width: 34px; height: 34px; }

.iu-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
.iu-file { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.iu-actions label.btn { cursor: pointer; margin: 0; }
.iu-hint { flex-basis: 100%; font-size: 12px; color: var(--color-text-muted); }
.iu-error { display: block; margin-top: 6px; font-size: 12px; color: var(--color-error, #b3261e); }
    `],
})
export class ImageUploadComponent {
    label = input<string>('');
    /** URL actual servida por el backend (`/api/.../{id}/imagen`) para previsualizar. */
    currentUrl = input<string | null | undefined>(null);
    accept = input<string>('image/jpeg,image/png,image/webp');
    /** Límite del backend: 500 KB. */
    maxSizeKb = input<number>(500);
    disabled = input<boolean>(false);

    /** Archivo válido elegido por el usuario; la página lo sube tras guardar. */
    fileSelected = output<File>();
    /** El usuario quitó la imagen. */
    cleared = output<void>();

    readonly inputId = `img-upload-${Math.random().toString(36).slice(2, 8)}`;

    protected readonly dragging = signal(false);
    protected readonly error = signal('');
    private readonly localPreview = signal<string>('');
    private readonly quitada = signal(false);

    protected readonly previewUrl = computed(() => {
        if (this.localPreview()) return this.localPreview();
        if (this.quitada()) return '';
        return this.currentUrl() ?? '';
    });

    protected readonly hint = computed(
        () => `JPG, PNG o WebP · máximo ${this.maxSizeKb} KB`,
    );

    protected onDragOver(event: DragEvent): void {
        event.preventDefault();
        if (!this.disabled()) this.dragging.set(true);
    }

    protected onDrop(event: DragEvent): void {
        event.preventDefault();
        this.dragging.set(false);
        const file = event.dataTransfer?.files?.[0];
        if (file) this.procesar(file);
    }

    protected onFileInput(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) this.procesar(file);
    }

    protected limpiar(): void {
        this.localPreview.set('');
        this.error.set('');
        this.quitada.set(true);
        this.cleared.emit();
    }

    /** Valida contra las mismas reglas que aplica el backend antes de subir. */
    private procesar(file: File): void {
        const permitidos = this.accept().split(',').map(t => t.trim());
        if (!permitidos.includes(file.type)) {
            this.error.set('Formato no permitido. Use JPG, PNG o WebP.');
            return;
        }
        if (file.size > this.maxSizeKb() * 1024) {
            this.error.set(`La imagen supera el límite de ${this.maxSizeKb()} KB.`);
            return;
        }
        this.error.set('');
        this.quitada.set(false);

        const reader = new FileReader();
        reader.onload = () => this.localPreview.set(String(reader.result ?? ''));
        reader.readAsDataURL(file);

        this.fileSelected.emit(file);
    }
}
