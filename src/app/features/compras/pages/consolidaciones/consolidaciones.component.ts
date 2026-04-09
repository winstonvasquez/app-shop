import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface TiendaReq { storeId: string; storeNombre: string; cantidad: number; }
interface LineaReq  { productoId: string; productoNombre: string; lineas: TiendaReq[]; }

interface ConsolidacionDto {
    id: string;
    codigo: string;
    descripcion: string;
    estado: string;
    proveedorId?: string;
    proveedorNombre?: string;
    lineas: Array<{
        productoId: string;
        productoNombre: string;
        cantidadTotal: number;
        tiendas: Array<{ storeId: string; storeNombre: string; cantidad: number }>;
    }>;
    createdAt: string;
}

@Component({
    selector: 'app-consolidaciones',
    standalone: true,
    imports: [ReactiveFormsModule, DecimalPipe],
    templateUrl: './consolidaciones.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsolidacionesComponent implements OnInit {
    private http = inject(HttpClient);
    private fb = inject(FormBuilder);
    private baseUrl = `${environment.apiUrls.purchases}/api/consolidaciones`;

    consolidaciones = signal<ConsolidacionDto[]>([]);
    cargando = signal(false);
    error = signal('');
    mostrarForm = signal(false);

    form = this.fb.group({
        descripcion: ['', Validators.required],
        proveedorId: [''],
    });

    ngOnInit(): void { this.cargar(); }

    cargar(): void {
        this.cargando.set(true);
        this.http.get<ConsolidacionDto[]>(this.baseUrl).subscribe({
            next: (data) => { this.consolidaciones.set(data); this.cargando.set(false); },
            error: () => { this.error.set('Error al cargar consolidaciones'); this.cargando.set(false); }
        });
    }

    cerrarSolicitud(id: string): void {
        this.http.put(`${this.baseUrl}/${id}/cerrar`, {}).subscribe({
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
}
