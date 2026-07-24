import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { MONEDA } from '@shared/constants/sunat.constants';
import { ProveedorService } from '../../services/proveedor.service';
import { ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent } from '@shared/components';
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
    imports: [DecimalPipe, ReactiveFormsModule, ButtonComponent, CatalogSelectComponent, ServerSearchSelectComponent],
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

    form: FormGroup = this.fb.group({
        codigo: ['', Validators.required],
        descripcion: ['', Validators.required],
        categoria: ['', Validators.required],
        unidadMedida: ['UND'],
        especificaciones: [''],
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

    crear(): void {
        if (this.form.invalid) return;
        this.saving.set(true);
        this.http.post<CatalogoItem>(this.baseUrl, this.form.value, { headers: this.getHeaders() })
            .subscribe({
                next: item => {
                    this.items.update(list => [item, ...list]);
                    this.form.reset({ unidadMedida: 'UND' });
                    this.showForm.set(false);
                    this.saving.set(false);
                },
                error: () => this.saving.set(false),
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
}
