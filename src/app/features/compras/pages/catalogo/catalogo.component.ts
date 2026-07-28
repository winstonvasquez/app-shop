import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { MONEDA } from '@shared/constants/sunat.constants';
import { ProveedorService } from '../../services/proveedor.service';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent } from '@shared/components';
import { ImageUploadComponent } from '@shared/ui/forms/image-upload/image-upload.component';
import { bloquearEnEdicion } from '@shared/utils/form-lock';
import { proveedorSelectSource } from '../../components/select-sources';

interface ProveedorHomologado {
    id: string;
    proveedorId: string;
    proveedorNombre: string;
    precioReferencia?: number;
    moneda: string;
    plazoEntregaDias?: number;
    esPreferido: boolean;
}

interface CatalogoItem {
    id: string;
    codigo: string;
    descripcion: string;
    categoria: string;
    unidadMedida: string;
    especificaciones?: string;
    imagenUrl?: string;
    activo: boolean;
    proveedores: ProveedorHomologado[];
}

interface CatalogoPage {
    content: CatalogoItem[];
    totalElements: number;
    totalPages: number;
    number: number;
}

@Component({
    selector: 'app-catalogo',
    standalone: true,
    imports: [
        DecimalPipe, ReactiveFormsModule, ButtonComponent, CatalogSelectComponent,
        ServerSearchSelectComponent, ImageUploadComponent
    ],
    templateUrl: './catalogo.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoComponent implements OnInit {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private proveedorService = inject(ProveedorService);
    private fb = inject(FormBuilder);
    private baseUrl = `${environment.apiUrls.purchases}/api/catalogo`;

    items = signal<CatalogoItem[]>([]);
    categorias = signal<string[]>([]);
    totalElements = signal(0);
    totalPages = signal(0);
    currentPage = signal(0);
    loading = signal(false);
    showForm = signal(false);
    showProveedorForm = signal(false);
    saving = signal(false);
    selectedItem = signal<CatalogoItem | null>(null);
    filtroCategoria = signal('');
    busqueda = signal('');
    /**
     * Filtro de vigencia. El backend, sin este parámetro, solo devuelve ítems ACTIVOS
     * (ver CatalogoComprasCommandService#buscar) → sin el filtro un ítem desactivado
     * quedaba inalcanzable desde la interfaz. 'true' = activos, 'false' = inactivos.
     */
    filtroActivo = signal('true');

    // Drawer de ítem: crear vs. editar (el backend ya expone PUT /api/catalogo/{id}).
    editMode = signal(false);
    editandoId = signal<string | null>(null);
    /** Archivo elegido en el drawer; se sube tras guardar, porque el POST multipart necesita el id. */
    imagenSeleccionada = signal<File | null>(null);
    formError = signal<string | null>(null);

    form: FormGroup = this.fb.group({
        codigo: ['', Validators.required],
        descripcion: ['', Validators.required],
        categoria: ['', Validators.required],
        unidadMedida: ['UND'],
        especificaciones: [''],
        // La imagen se guarda como binario en la BD; este control solo transporta la URL
        // que sirve el backend (`/purchases/api/catalogo/{id}/imagen`) para previsualizar.
        imagenUrl: [''],
        // `activo` viaja en ActualizarCatalogoRequest: editable en edición para poder
        // REACTIVAR un ítem dado de baja con DELETE /{id}. En el alta siempre es true.
        activo: [true],
    });

    proveedorForm: FormGroup = this.fb.group({
        proveedorId: ['', Validators.required],
        precioReferencia: [null],
        moneda: [MONEDA.PEN],
        plazoEntregaDias: [null],
        esPreferido: [false],
    });

    readonly proveedorSource = proveedorSelectSource(this.proveedorService);

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    ngOnInit(): void {
        this.cargar();
        this.http.get<string[]>(`${this.baseUrl}/categorias`, { headers: this.getHeaders() })
            .subscribe(cats => this.categorias.set(cats));
    }

    cargar(page = 0): void {
        this.loading.set(true);
        let params = new HttpParams().set('page', page).set('size', 20);
        if (this.filtroCategoria()) params = params.set('categoria', this.filtroCategoria());
        if (this.busqueda().trim()) params = params.set('q', this.busqueda().trim());
        // Siempre explícito: permite listar los inactivos para volver a activarlos.
        params = params.set('activo', this.filtroActivo());

        this.http.get<CatalogoPage>(this.baseUrl, { headers: this.getHeaders(), params })
            .subscribe({
                next: r => {
                    this.items.set(r.content);
                    this.totalElements.set(r.totalElements);
                    this.totalPages.set(r.totalPages);
                    this.currentPage.set(r.number);
                    this.loading.set(false);
                },
                error: () => this.loading.set(false),
            });
    }

    abrirCrear(): void {
        this.editMode.set(false);
        this.editandoId.set(null);
        this.imagenSeleccionada.set(null);
        this.formError.set(null);
        this.form.reset({ unidadMedida: 'UND', imagenUrl: '', activo: true });
        this.aplicarBloqueos();
        this.showForm.set(true);
    }

    abrirEditar(item: CatalogoItem): void {
        this.editMode.set(true);
        this.editandoId.set(item.id);
        this.imagenSeleccionada.set(null);
        this.formError.set(null);
        this.form.reset({
            codigo: item.codigo,
            descripcion: item.descripcion,
            categoria: item.categoria,
            unidadMedida: item.unidadMedida,
            especificaciones: item.especificaciones ?? '',
            imagenUrl: item.imagenUrl ?? '',
            activo: item.activo,
        });
        this.aplicarBloqueos();
        this.showForm.set(true);
    }

    /**
     * Bloqueo único del drawer (ver `@shared/utils/form-lock`):
     * - `codigo` identifica al ítem homologado en OCs y cotizaciones ya emitidas.
     * - `activo` es editable en edición (única vía para reactivar una baja lógica) y
     *   bloqueado en el alta, donde el backend siempre lo crea activo.
     */
    private aplicarBloqueos(): void {
        bloquearEnEdicion(this.form, ['codigo'], this.editMode());
        // Flag invertido a propósito: `activo` se bloquea en el ALTA y se libera al EDITAR.
        bloquearEnEdicion(this.form, ['activo'], !this.editMode());
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.saving.set(true);
        this.formError.set(null);

        // getRawValue(): `codigo` (edición) y `activo` (alta) están deshabilitados y no
        // aparecerían en `.value`.
        const v = this.form.getRawValue();
        const comun = {
            descripcion: v.descripcion,
            categoria: v.categoria,
            unidadMedida: v.unidadMedida,
            especificaciones: v.especificaciones || null,
            imagenUrl: v.imagenUrl || null,
        };

        const id = this.editandoId();
        // `activo` solo en la edición (ActualizarCatalogoRequest); en el alta el backend
        // lo crea activo. `codigo` solo en el alta.
        const req = this.editMode() && id
            ? this.http.put<CatalogoItem>(`${this.baseUrl}/${id}`, { ...comun, activo: !!v.activo },
                { headers: this.getHeaders() })
            : this.http.post<CatalogoItem>(this.baseUrl, { ...comun, codigo: v.codigo }, { headers: this.getHeaders() });

        req.subscribe({
            next: item => this.subirImagenSiHay(item),
            error: () => {
                this.formError.set('No se pudo guardar el ítem del catálogo.');
                this.saving.set(false);
            },
        });
    }

    /** La imagen se sube después de guardar: el POST multipart necesita el id del ítem. */
    private subirImagenSiHay(item: CatalogoItem): void {
        const archivo = this.imagenSeleccionada();
        if (!archivo) {
            this.finalizarGuardado();
            return;
        }
        const datos = new FormData();
        datos.append('file', archivo);
        this.http.post<CatalogoItem>(`${this.baseUrl}/${item.id}/imagen`, datos, { headers: this.getHeaders() })
            .subscribe({
                next: () => this.finalizarGuardado(),
                error: () => {
                    this.formError.set('El ítem se guardó, pero falló la subida de la imagen.');
                    this.saving.set(false);
                },
            });
    }

    /**
     * Recarga la página en vez de parchear la lista en memoria: al cambiar `activo` el
     * ítem puede dejar de pertenecer al filtro de vigencia vigente, y el servidor es la
     * única fuente fiable de qué entra en la página.
     */
    private finalizarGuardado(): void {
        this.imagenSeleccionada.set(null);
        this.form.reset({ unidadMedida: 'UND', imagenUrl: '', activo: true });
        this.showForm.set(false);
        this.saving.set(false);
        // Un ítem recién creado nace activo: si se estaba viendo la lista de inactivos,
        // se vuelve a la de activos para que el alta no parezca haberse perdido.
        if (!this.editMode() && this.filtroActivo() === 'false') {
            this.filtroActivo.set('true');
            this.cargar(0);
            return;
        }
        this.cargar(this.currentPage());
    }

    /**
     * «Quitar» del componente de subida. Descarta el archivo elegido, limpia el control
     * (el PUT posterior manda `imagenUrl: null` y borra cualquier URL externa) y, si el
     * ítem ya existe con imagen binaria en BD, la elimina en el servidor.
     */
    quitarImagen(): void {
        this.imagenSeleccionada.set(null);
        const urlActual: string = this.form.get('imagenUrl')?.value ?? '';
        this.form.get('imagenUrl')?.setValue('');

        const id = this.editandoId();
        // Solo hay binario que borrar si el ítem ya está creado y la URL apunta al endpoint.
        if (!id || !urlActual.endsWith(`/${id}/imagen`)) return;

        this.http.delete<CatalogoItem>(`${this.baseUrl}/${id}/imagen`, { headers: this.getHeaders() })
            .subscribe({
                next: actualizado => this.items.update(
                    list => list.map(i => (i.id === actualizado.id ? actualizado : i))),
                error: () => this.formError.set('No se pudo eliminar la imagen del ítem.'),
            });
    }

    abrirProveedorForm(item: CatalogoItem): void {
        this.selectedItem.set(item);
        this.showProveedorForm.set(true);
    }

    agregarProveedor(): void {
        const item = this.selectedItem();
        if (!item || this.proveedorForm.invalid) return;
        this.saving.set(true);
        this.http.post<CatalogoItem>(
            `${this.baseUrl}/${item.id}/proveedores`,
            this.proveedorForm.value,
            { headers: this.getHeaders() }
        ).subscribe({
            next: updated => {
                this.items.update(list => list.map(i => i.id === item.id ? updated : i));
                this.selectedItem.set(updated);
                this.proveedorForm.reset({ moneda: MONEDA.PEN, esPreferido: false });
                this.showProveedorForm.set(false);
                this.saving.set(false);
            },
            error: () => this.saving.set(false),
        });
    }

    desactivarProveedor(catalogoId: string, proveedorId: string): void {
        if (!confirm('¿Quitar este proveedor homologado del ítem?')) return;
        this.http.delete<void>(
            `${this.baseUrl}/${catalogoId}/proveedores/${proveedorId}`,
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => {
                this.selectedItem.update(item => item && item.id === catalogoId
                    ? { ...item, proveedores: item.proveedores.filter(p => p.proveedorId !== proveedorId) }
                    : item);
                this.items.update(list => list.map(i => i.id === catalogoId
                    ? { ...i, proveedores: i.proveedores.filter(p => p.proveedorId !== proveedorId) }
                    : i));
            },
        });
    }

    desactivarItem(id: string): void {
        if (!confirm('¿Desactivar este ítem del catálogo?')) return;
        this.http.delete<void>(
            `${this.baseUrl}/${id}`,
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => this.cargar(this.currentPage()),
        });
    }

    /**
     * Reactiva un ítem dado de baja (PUT con `activo: true`). Es el inverso de
     * `desactivarItem`: sin esto la baja lógica dejaba el ítem inaccesible para siempre.
     * Se reenvían `especificaciones` e `imagenUrl` tal como están porque en esos dos
     * campos el backend interpreta `null` como "borrar" (lo usa el botón «Quitar» de la
     * imagen), no como "no tocar".
     */
    reactivarItem(item: CatalogoItem): void {
        this.http.put<CatalogoItem>(
            `${this.baseUrl}/${item.id}`,
            {
                activo: true,
                especificaciones: item.especificaciones ?? null,
                imagenUrl: item.imagenUrl ?? null,
            },
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => this.cargar(this.currentPage()),
        });
    }

    /** Cambia entre ítems vigentes y dados de baja. Vuelve a la primera página. */
    cambiarFiltroActivo(valor: string): void {
        this.filtroActivo.set(valor);
        this.cargar(0);
    }
}
