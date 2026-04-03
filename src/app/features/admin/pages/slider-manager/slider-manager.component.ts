import {
    Component, ChangeDetectionStrategy, inject, signal, OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface Banner {
    id:        number;
    titulo:    string;
    subtitulo: string;
    imagenUrl: string;
    link:      string;
    orden:     number;
    activo:    boolean;
}

type BannerForm = Omit<Banner, 'id'>;

const EMPTY_FORM = (): BannerForm => ({
    titulo: '', subtitulo: '', imagenUrl: '', link: '', orden: 0, activo: true,
});

@Component({
    selector: 'app-slider-manager',
    standalone: true,
    imports: [FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="page-header">
            <div>
                <h1 class="page-title">Gestor de Slider</h1>
                <p class="page-subtitle">Administra los banners del carrusel principal de la tienda</p>
            </div>
            <button class="btn btn-primary" (click)="openCreate()">+ Nuevo banner</button>
        </div>

        <!-- Barra de caché -->
        <div class="card mb-4" style="padding:12px 16px; display:flex; align-items:center; justify-content:space-between; gap:1rem">
            <span style="font-size:.875rem; color:var(--color-text-subtle)">
                Las imágenes se cachean 24 h en el navegador. Usa "Limpiar caché" si actualizaste una imagen y no se refleja.
            </span>
            <button class="btn btn-secondary" style="white-space:nowrap" (click)="limpiarTodoCache()" [disabled]="clearingCache()">
                @if (clearingCache()) { Limpiando... } @else { Limpiar todo el caché }
            </button>
        </div>

        @if (successMsg()) {
            <div class="card mb-4" style="border-left:3px solid var(--color-success); padding:12px 16px">
                <p style="color:var(--color-success); font-size:.875rem; margin:0">{{ successMsg() }}</p>
            </div>
        }
        @if (errorMsg()) {
            <div class="card mb-4" style="border-left:3px solid var(--color-error); padding:12px 16px">
                <p style="color:var(--color-error); font-size:.875rem; margin:0">{{ errorMsg() }}</p>
            </div>
        }

        <!-- Lista de banners -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Banners ({{ banners().length }})</h3>
            </div>
            @if (loading()) {
                <div class="loading-container"><div class="spinner"></div></div>
            } @else if (banners().length === 0) {
                <div class="card-body" style="text-align:center; padding:2rem; color:var(--color-text-muted)">
                    <p>No hay banners. Crea el primero con "+ Nuevo banner".</p>
                </div>
            } @else {
                <div class="card-body" style="padding:0">
                    <table class="table">
                        <thead>
                            <tr>
                                <th class="table-header-cell">Orden</th>
                                <th class="table-header-cell">Preview</th>
                                <th class="table-header-cell">Título</th>
                                <th class="table-header-cell">Link</th>
                                <th class="table-header-cell">Estado</th>
                                <th class="table-header-cell">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (banner of banners(); track banner.id) {
                                <tr class="table-row">
                                    <td class="table-cell" style="width:60px; text-align:center">
                                        <span style="font-weight:600">{{ banner.orden }}</span>
                                    </td>
                                    <td class="table-cell" style="width:112px">
                                        @if (banner.imagenUrl) {
                                            <img [src]="banner.imagenUrl" [alt]="banner.titulo"
                                                 style="width:96px; height:54px; object-fit:cover; border-radius:6px;
                                                        border:1px solid var(--color-border)">
                                        } @else {
                                            <div style="width:96px; height:54px; border-radius:6px;
                                                        background:var(--color-surface-raised);
                                                        border:1px solid var(--color-border);
                                                        display:flex; align-items:center; justify-content:center;
                                                        font-size:.7rem; color:var(--color-text-muted)">
                                                Sin img
                                            </div>
                                        }
                                    </td>
                                    <td class="table-cell">
                                        <p style="font-weight:500; margin:0">{{ banner.titulo }}</p>
                                        @if (banner.subtitulo) {
                                            <p style="font-size:.8rem; color:var(--color-text-muted); margin:2px 0 0">
                                                {{ banner.subtitulo }}
                                            </p>
                                        }
                                    </td>
                                    <td class="table-cell" style="font-size:.8rem; color:var(--color-text-muted)">
                                        {{ banner.link || '—' }}
                                    </td>
                                    <td class="table-cell">
                                        <button (click)="toggle(banner)"
                                                [class]="banner.activo ? 'badge badge-success' : 'badge badge-neutral'"
                                                style="cursor:pointer; border:none; font-size:.75rem">
                                            {{ banner.activo ? 'Activo' : 'Inactivo' }}
                                        </button>
                                    </td>
                                    <td class="table-cell">
                                        <div style="display:flex; gap:.375rem; flex-wrap:wrap">
                                            <button class="btn-icon btn-icon-edit" (click)="openEdit(banner)" title="Editar">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                     stroke="currentColor" stroke-width="2">
                                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                </svg>
                                            </button>
                                            <button class="btn-icon" (click)="openUpload(banner)" title="Subir imagen"
                                                    style="color:var(--color-primary)">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                     stroke="currentColor" stroke-width="2">
                                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                                    <polyline points="17 8 12 3 7 8"/>
                                                    <line x1="12" y1="3" x2="12" y2="15"/>
                                                </svg>
                                            </button>
                                            <button class="btn-icon" (click)="invalidarCache(banner)" title="Limpiar caché"
                                                    style="color:var(--color-text-muted)">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                     stroke="currentColor" stroke-width="2">
                                                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                                                </svg>
                                            </button>
                                            <button class="btn-icon btn-icon-delete" (click)="confirmDelete(banner)" title="Eliminar">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                     stroke="currentColor" stroke-width="2">
                                                    <polyline points="3 6 5 6 21 6"/>
                                                    <path d="M19 6l-1 14H6L5 6"/>
                                                    <path d="M10 11v6M14 11v6"/>
                                                    <path d="M9 6V4h6v2"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            }
        </div>

        <!-- Modal formulario texto -->
        @if (showModal()) {
            <div class="modal-overlay" (click)="closeModal()">
                <div class="modal-content" style="max-width:560px" (click)="$event.stopPropagation()">
                    <div class="modal-header">
                        <h2 class="modal-title">{{ editingId() ? 'Editar banner' : 'Nuevo banner' }}</h2>
                        <button class="modal-close-btn" (click)="closeModal()">✕</button>
                    </div>
                    <div class="modal-body" style="display:flex; flex-direction:column; gap:1rem">

                        <!-- Sección de imagen: upload o URL -->
                        <div>
                            <label class="input-label">Imagen</label>
                            <!-- Zona de upload drag-and-drop -->
                            <div class="upload-zone" (click)="fileInput.click()"
                                 (dragover)="$event.preventDefault()" (drop)="onDrop($event)"
                                 [class.has-preview]="previewUrl()">
                                @if (previewUrl()) {
                                    <img [src]="previewUrl()" alt="preview"
                                         style="width:100%; height:160px; object-fit:cover; border-radius:6px">
                                } @else {
                                    <div style="display:flex; flex-direction:column; align-items:center; gap:.5rem; color:var(--color-text-muted)">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                            <polyline points="17 8 12 3 7 8"/>
                                            <line x1="12" y1="3" x2="12" y2="15"/>
                                        </svg>
                                        <span style="font-size:.875rem">Arrastrá o hacé clic para subir imagen</span>
                                        <span style="font-size:.75rem">JPEG, PNG o WebP · máx. 500 KB</span>
                                    </div>
                                }
                            </div>
                            <input #fileInput type="file" accept="image/jpeg,image/png,image/webp"
                                   style="display:none" (change)="onFileSelected($event)">
                            @if (fileError()) {
                                <p style="color:var(--color-error); font-size:.8rem; margin:.25rem 0 0">{{ fileError() }}</p>
                            }
                            <!-- URL alternativa para imágenes externas -->
                            <div style="margin-top:.75rem">
                                <label class="input-label" style="font-size:.8rem">O ingresá una URL externa (opcional)</label>
                                <input class="input-field" type="url" placeholder="https://..."
                                       [(ngModel)]="form().imagenUrl">
                            </div>
                        </div>

                        <div>
                            <label class="input-label">Título *</label>
                            <input class="input-field" type="text" placeholder="Ej: Oferta de temporada"
                                   [(ngModel)]="form().titulo">
                        </div>

                        <div>
                            <label class="input-label">Subtítulo</label>
                            <input class="input-field" type="text" placeholder="Descripción corta del banner"
                                   [(ngModel)]="form().subtitulo">
                        </div>

                        <div>
                            <label class="input-label">Link (URL de destino)</label>
                            <input class="input-field" type="url" placeholder="/productos?categoria=oferta"
                                   [(ngModel)]="form().link">
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:.75rem">
                            <div>
                                <label class="input-label">Orden</label>
                                <input class="input-field" type="number" min="0" [(ngModel)]="form().orden">
                            </div>
                            <div style="display:flex; align-items:flex-end; padding-bottom:2px">
                                <label style="display:flex; align-items:center; gap:.5rem; cursor:pointer;
                                              font-size:.875rem; color:var(--color-text-subtle)">
                                    <input type="checkbox" [(ngModel)]="form().activo"
                                           style="width:16px; height:16px; cursor:pointer">
                                    Activo
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
                        <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
                            @if (saving()) { Guardando... } @else { Guardar }
                        </button>
                    </div>
                </div>
            </div>
        }

        <!-- Modal upload de imagen para banner existente -->
        @if (uploadingBannerId()) {
            <div class="modal-overlay" (click)="closeUpload()">
                <div class="modal-content" style="max-width:480px" (click)="$event.stopPropagation()">
                    <div class="modal-header">
                        <h2 class="modal-title">Subir imagen</h2>
                        <button class="modal-close-btn" (click)="closeUpload()">✕</button>
                    </div>
                    <div class="modal-body" style="display:flex; flex-direction:column; gap:.875rem">
                        <div class="upload-zone" (click)="uploadFileInput.click()"
                             (dragover)="$event.preventDefault()" (drop)="onUploadDrop($event)"
                             [class.has-preview]="uploadPreviewUrl()">
                            @if (uploadPreviewUrl()) {
                                <img [src]="uploadPreviewUrl()" alt="preview"
                                     style="width:100%; height:160px; object-fit:cover; border-radius:6px">
                            } @else {
                                <div style="display:flex; flex-direction:column; align-items:center; gap:.5rem; color:var(--color-text-muted)">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                        <polyline points="17 8 12 3 7 8"/>
                                        <line x1="12" y1="3" x2="12" y2="15"/>
                                    </svg>
                                    <span style="font-size:.875rem">Arrastrá o hacé clic para seleccionar</span>
                                    <span style="font-size:.75rem">JPEG, PNG o WebP · máx. 500 KB</span>
                                </div>
                            }
                        </div>
                        <input #uploadFileInput type="file" accept="image/jpeg,image/png,image/webp"
                               style="display:none" (change)="onUploadFileSelected($event)">
                        @if (uploadFileError()) {
                            <p style="color:var(--color-error); font-size:.8rem; margin:0">{{ uploadFileError() }}</p>
                        }
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" (click)="closeUpload()">Cancelar</button>
                        <button class="btn btn-primary" [disabled]="saving() || !uploadFile()" (click)="doUpload()">
                            @if (saving()) { Subiendo... } @else { Subir imagen }
                        </button>
                    </div>
                </div>
            </div>
        }

        <!-- Modal confirmación de borrado -->
        @if (deleteId()) {
            <div class="modal-overlay" (click)="deleteId.set(null)">
                <div class="modal-content" style="max-width:400px" (click)="$event.stopPropagation()">
                    <div class="modal-header">
                        <h2 class="modal-title">Eliminar banner</h2>
                        <button class="modal-close-btn" (click)="deleteId.set(null)">✕</button>
                    </div>
                    <div class="modal-body">
                        <p style="color:var(--color-text-subtle)">
                            ¿Estás seguro de que querés eliminar <strong>{{ deleteTitle() }}</strong>?
                            Esta acción no se puede deshacer.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" (click)="deleteId.set(null)">Cancelar</button>
                        <button class="btn btn-danger" [disabled]="saving()" (click)="doDelete()">
                            @if (saving()) { Eliminando... } @else { Eliminar }
                        </button>
                    </div>
                </div>
            </div>
        }
    `,
    styles: [`
        .upload-zone {
            border: 2px dashed var(--color-border);
            border-radius: 8px;
            padding: 2rem 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 120px;
            transition: border-color .2s, background .2s;
        }
        .upload-zone:hover { border-color: var(--color-primary); background: color-mix(in oklch, var(--color-primary) 5%, transparent); }
        .upload-zone.has-preview { padding: 0; border-style: solid; }
        .mb-4 { margin-bottom: 1rem; }
    `],
})
export class SliderManagerComponent implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.sales}/api/v1/banners`;

    banners       = signal<Banner[]>([]);
    loading       = signal(true);
    saving        = signal(false);
    clearingCache = signal(false);
    successMsg    = signal('');
    errorMsg      = signal('');

    // Modal de creación/edición de texto
    showModal  = signal(false);
    editingId  = signal<number | null>(null);
    form       = signal<BannerForm>(EMPTY_FORM());
    previewUrl = signal<string>('');
    fileError  = signal('');
    pendingFile = signal<File | null>(null);

    // Modal de upload para banner existente
    uploadingBannerId = signal<number | null>(null);
    uploadPreviewUrl  = signal<string>('');
    uploadFileError   = signal('');
    uploadFile        = signal<File | null>(null);

    // Modal de borrado
    deleteId    = signal<number | null>(null);
    deleteTitle = signal('');

    ngOnInit(): void { this.loadBanners(); }

    private loadBanners(): void {
        this.loading.set(true);
        this.http.get<Banner[]>(`${this.baseUrl}/admin`).subscribe({
            next: list => { this.banners.set(list); this.loading.set(false); },
            error: ()   => { this.loading.set(false); this.errorMsg.set('Error al cargar banners.'); },
        });
    }

    // ── Creación / edición ────────────────────────────────────
    openCreate(): void {
        this.editingId.set(null);
        this.form.set(EMPTY_FORM());
        this.previewUrl.set('');
        this.pendingFile.set(null);
        this.fileError.set('');
        this.clearMessages();
        this.showModal.set(true);
    }

    openEdit(banner: Banner): void {
        this.editingId.set(banner.id);
        this.form.set({ titulo: banner.titulo, subtitulo: banner.subtitulo ?? '',
                        imagenUrl: banner.imagenUrl, link: banner.link ?? '',
                        orden: banner.orden, activo: banner.activo });
        this.previewUrl.set(banner.imagenUrl ?? '');
        this.pendingFile.set(null);
        this.fileError.set('');
        this.clearMessages();
        this.showModal.set(true);
    }

    closeModal(): void { this.showModal.set(false); }

    onFileSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) this.processFile(file, this.previewUrl, this.fileError, this.pendingFile);
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        const file = event.dataTransfer?.files?.[0];
        if (file) this.processFile(file, this.previewUrl, this.fileError, this.pendingFile);
    }

    private processFile(file: File, previewSig: ReturnType<typeof signal<string>>,
                        errorSig: ReturnType<typeof signal<string>>,
                        fileSig: ReturnType<typeof signal<File | null>>): void {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) {
            errorSig.set('Solo se permiten archivos JPEG, PNG o WebP.');
            return;
        }
        if (file.size > 512_000) {
            errorSig.set('La imagen supera el límite de 500 KB.');
            return;
        }
        errorSig.set('');
        fileSig.set(file);
        const reader = new FileReader();
        reader.onload = e => previewSig.set(e.target?.result as string);
        reader.readAsDataURL(file);
    }

    save(): void {
        const f = this.form();
        const file = this.pendingFile();
        if (!f.titulo.trim()) { this.errorMsg.set('El título es obligatorio.'); return; }
        if (!file && !f.imagenUrl.trim()) { this.errorMsg.set('Seleccioná una imagen o ingresá una URL.'); return; }

        this.saving.set(true);
        this.clearMessages();
        const id = this.editingId();
        const body = { ...f, imagenUrl: f.imagenUrl || null };

        const req$ = id
            ? this.http.put<Banner>(`${this.baseUrl}/${id}`, body)
            : this.http.post<Banner>(this.baseUrl, body);

        req$.subscribe({
            next: (saved) => {
                if (file && saved.id) {
                    this.uploadImageToBanner(saved.id, file, () => {
                        this.saving.set(false);
                        this.showModal.set(false);
                        this.successMsg.set(id ? 'Banner actualizado.' : 'Banner creado.');
                        this.loadBanners();
                    });
                } else {
                    this.saving.set(false);
                    this.showModal.set(false);
                    this.successMsg.set(id ? 'Banner actualizado.' : 'Banner creado.');
                    this.loadBanners();
                }
            },
            error: () => { this.saving.set(false); this.errorMsg.set('Error al guardar el banner.'); },
        });
    }

    private uploadImageToBanner(id: number, file: File, onDone: () => void): void {
        const formData = new FormData();
        formData.append('file', file);
        this.http.post<Banner>(`${this.baseUrl}/${id}/imagen`, formData).subscribe({
            next: () => onDone(),
            error: () => { this.saving.set(false); this.errorMsg.set('Banner guardado pero falló la subida de imagen.'); },
        });
    }

    // ── Upload para banner existente ──────────────────────────
    openUpload(banner: Banner): void {
        this.uploadingBannerId.set(banner.id);
        this.uploadPreviewUrl.set(banner.imagenUrl ?? '');
        this.uploadFile.set(null);
        this.uploadFileError.set('');
    }

    closeUpload(): void { this.uploadingBannerId.set(null); }

    onUploadFileSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) this.processFile(file, this.uploadPreviewUrl, this.uploadFileError, this.uploadFile);
    }

    onUploadDrop(event: DragEvent): void {
        event.preventDefault();
        const file = event.dataTransfer?.files?.[0];
        if (file) this.processFile(file, this.uploadPreviewUrl, this.uploadFileError, this.uploadFile);
    }

    doUpload(): void {
        const id = this.uploadingBannerId();
        const file = this.uploadFile();
        if (!id || !file) return;
        this.saving.set(true);
        const formData = new FormData();
        formData.append('file', file);
        this.http.post<Banner>(`${this.baseUrl}/${id}/imagen`, formData).subscribe({
            next: () => {
                this.saving.set(false);
                this.closeUpload();
                this.successMsg.set('Imagen actualizada correctamente.');
                this.loadBanners();
            },
            error: () => { this.saving.set(false); this.uploadFileError.set('Error al subir la imagen.'); },
        });
    }

    // ── Caché ─────────────────────────────────────────────────
    invalidarCache(banner: Banner): void {
        this.http.post<void>(`${this.baseUrl}/${banner.id}/invalidar-cache`, {}).subscribe({
            next: () => { this.successMsg.set(`Caché de "${banner.titulo}" invalidado.`); this.loadBanners(); },
            error: () => this.errorMsg.set('Error al invalidar el caché.'),
        });
    }

    limpiarTodoCache(): void {
        this.clearingCache.set(true);
        const requests = this.banners()
            .filter(b => b.imagenUrl?.includes('/imagen'))
            .map(b => this.http.post<void>(`${this.baseUrl}/${b.id}/invalidar-cache`, {}));
        if (requests.length === 0) { this.clearingCache.set(false); return; }

        import('rxjs').then(({ forkJoin }) => {
            forkJoin(requests).subscribe({
                next: () => { this.clearingCache.set(false); this.successMsg.set('Caché limpiado para todos los banners.'); this.loadBanners(); },
                error: () => { this.clearingCache.set(false); this.errorMsg.set('Error al limpiar el caché.'); },
            });
        });
    }

    // ── Toggle y borrado ──────────────────────────────────────
    toggle(banner: Banner): void {
        this.http.patch<Banner>(`${this.baseUrl}/${banner.id}/toggle`, {}).subscribe({
            next: updated => this.banners.update(list => list.map(b => b.id === updated.id ? { ...b, activo: updated.activo } : b)),
            error: () => this.errorMsg.set('Error al cambiar el estado.'),
        });
    }

    confirmDelete(banner: Banner): void { this.deleteId.set(banner.id); this.deleteTitle.set(banner.titulo); }

    doDelete(): void {
        const id = this.deleteId();
        if (!id) return;
        this.saving.set(true);
        this.http.delete<void>(`${this.baseUrl}/${id}`).subscribe({
            next: () => {
                this.saving.set(false);
                this.deleteId.set(null);
                this.successMsg.set('Banner eliminado.');
                this.banners.update(list => list.filter(b => b.id !== id));
            },
            error: () => { this.saving.set(false); this.errorMsg.set('Error al eliminar el banner.'); },
        });
    }

    private clearMessages(): void { this.successMsg.set(''); this.errorMsg.set(''); }
}
