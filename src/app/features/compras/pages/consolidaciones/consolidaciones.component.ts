import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { ButtonComponent, ServerSearchSelectComponent } from '@shared/components';
import { ProveedorService } from '../../services/proveedor.service';
import { proveedorSelectSource } from '../../components/select-sources';

interface TiendaReq { storeId: string; storeNombre: string; cantidad: number; }
interface LineaReq { productoId: string; sku?: string; productoNombre: string; unidadMedida?: string; tiendas: TiendaReq[]; }

interface ConsolidacionDto {
    id: string;
    codigo: string;
    descripcion: string;
    estado: string;
    lineas: Array<{
        id: string;
        productoId: string;
        sku?: string;
        productoNombre: string;
        cantidadTotal: number;
        unidadMedida?: string;
        proveedorId?: string;
        precioUnitario?: number;
        ordenCompraId?: string;
        tiendas: Array<{ id: string; storeId: string; storeNombre: string; cantidad: number }>;
    }>;
    createdAt: string;
}

@Component({
    selector: 'app-consolidaciones',
    standalone: true,
    imports: [ReactiveFormsModule, DecimalPipe, ButtonComponent, ServerSearchSelectComponent],
    templateUrl: './consolidaciones.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsolidacionesComponent implements OnInit {
    private http = inject(HttpClient);
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private proveedorService = inject(ProveedorService);
    private baseUrl = `${environment.apiUrls.purchases}/api/consolidaciones`;

    readonly proveedorSource = proveedorSelectSource(this.proveedorService);

    consolidaciones = signal<ConsolidacionDto[]>([]);
    cargando = signal(false);
    error = signal('');
    mostrarForm = signal(false);
    guardando = signal(false);

    // Asignación de proveedor a una línea puntual (mini-modal)
    asignandoConsolidacionId = signal<string | null>(null);
    asignandoLineaId = signal<string | null>(null);
    asignando = signal(false);

    form = this.fb.group({
        descripcion: ['', Validators.required],
        lineas: this.fb.array([this.createLineaFormGroup()]),
    });

    proveedorForm = this.fb.group({
        proveedorId: ['', Validators.required],
        precioUnitario: [0, [Validators.required, Validators.min(0)]],
    });

    get lineasArray(): FormArray {
        return this.form.get('lineas') as FormArray;
    }

    ngOnInit(): void { this.cargar(); }

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    cargar(): void {
        this.cargando.set(true);
        this.http.get<ConsolidacionDto[]>(this.baseUrl, { headers: this.getHeaders() }).subscribe({
            next: (data) => { this.consolidaciones.set(data); this.cargando.set(false); },
            error: () => { this.error.set('Error al cargar consolidaciones'); this.cargando.set(false); }
        });
    }

    abrirForm(): void {
        this.form.reset({ descripcion: '' });
        while (this.lineasArray.length > 0) this.lineasArray.removeAt(0);
        this.lineasArray.push(this.createLineaFormGroup());
        this.mostrarForm.set(true);
    }

    cerrarForm(): void {
        this.mostrarForm.set(false);
    }

    tiendasArray(lineaIndex: number): FormArray {
        return this.lineasArray.at(lineaIndex).get('tiendas') as FormArray;
    }

    addLinea(): void {
        this.lineasArray.push(this.createLineaFormGroup());
    }

    removeLinea(index: number): void {
        if (this.lineasArray.length > 1) this.lineasArray.removeAt(index);
    }

    addTienda(lineaIndex: number): void {
        this.tiendasArray(lineaIndex).push(this.createTiendaFormGroup());
    }

    removeTienda(lineaIndex: number, tiendaIndex: number): void {
        const tiendas = this.tiendasArray(lineaIndex);
        if (tiendas.length > 1) tiendas.removeAt(tiendaIndex);
    }

    crear(): void {
        if (this.form.invalid) return;
        this.guardando.set(true);
        const v = this.form.value as { descripcion?: string; lineas?: Record<string, unknown>[] };
        const lineas: LineaReq[] = (v.lineas ?? []).map((l) => ({
            productoId: l['productoId'] as string,
            sku: (l['sku'] as string) || undefined,
            productoNombre: l['productoNombre'] as string,
            unidadMedida: (l['unidadMedida'] as string) || 'UND',
            tiendas: ((l['tiendas'] as Record<string, unknown>[]) ?? []).map((t) => ({
                storeId: t['storeId'] as string,
                storeNombre: t['storeNombre'] as string,
                cantidad: Number(t['cantidad']),
            })),
        }));
        this.http.post<ConsolidacionDto>(this.baseUrl,
            { descripcion: v.descripcion, lineas },
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => { this.guardando.set(false); this.mostrarForm.set(false); this.cargar(); },
            error: () => { this.guardando.set(false); this.error.set('Error al crear la consolidación'); }
        });
    }

    abrirAsignarProveedor(consolidacionId: string, lineaId: string): void {
        this.proveedorForm.reset({ proveedorId: '', precioUnitario: 0 });
        this.asignandoConsolidacionId.set(consolidacionId);
        this.asignandoLineaId.set(lineaId);
    }

    cerrarAsignarProveedor(): void {
        this.asignandoConsolidacionId.set(null);
        this.asignandoLineaId.set(null);
    }

    asignarProveedor(): void {
        const consolidacionId = this.asignandoConsolidacionId();
        const lineaId = this.asignandoLineaId();
        if (!consolidacionId || !lineaId || this.proveedorForm.invalid) return;
        this.asignando.set(true);
        const { proveedorId, precioUnitario } = this.proveedorForm.value;
        this.http.put<ConsolidacionDto>(
            `${this.baseUrl}/${consolidacionId}/lineas/${lineaId}/proveedor`,
            { proveedorId, precioUnitario },
            { headers: this.getHeaders() }
        ).subscribe({
            next: () => {
                this.asignando.set(false);
                this.cerrarAsignarProveedor();
                this.cargar();
            },
            error: () => { this.asignando.set(false); this.error.set('Error al asignar proveedor a la línea'); }
        });
    }

    cerrarSolicitud(id: string): void {
        this.http.put(`${this.baseUrl}/${id}/cerrar`, {}, { headers: this.getHeaders() }).subscribe({
            next: () => this.cargar(),
            error: () => this.error.set('Error al cerrar solicitud')
        });
    }

    estadoClass(estado: string): string {
        const m: Record<string, string> = {
            ABIERTA: 'badge-accent',
            EN_PROCESO: 'badge-warning',
            CERRADA: 'badge-success',
        };
        return m[estado] ?? 'badge-neutral';
    }

    private createLineaFormGroup(): FormGroup {
        return this.fb.group({
            productoId: ['', Validators.required],
            sku: [''],
            productoNombre: ['', Validators.required],
            unidadMedida: ['UND'],
            tiendas: this.fb.array([this.createTiendaFormGroup()]),
        });
    }

    private createTiendaFormGroup(): FormGroup {
        return this.fb.group({
            storeId: ['', Validators.required],
            storeNombre: ['', Validators.required],
            cantidad: [1, [Validators.required, Validators.min(1)]],
        });
    }
}
