import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { ButtonComponent } from '@shared/components';

interface ContratoDto {
    id: string;
    codigo: string;
    proveedorId: string;
    proveedorNombre: string;
    tipoContrato: string;
    descripcion: string;
    fechaInicio: string;
    fechaFin: string;
    montoContrato: number;
    moneda: string;
    estado: string;
    condicionesPago: string;
    renovacionAutomatica: boolean;
    diasAvisoVencimiento: number;
    createdAt: string;
}

@Component({
    selector: 'app-contratos',
    standalone: true,
    imports: [ReactiveFormsModule, DecimalPipe, ButtonComponent],
    templateUrl: './contratos.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContratosComponent implements OnInit {
    private http = inject(HttpClient);
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private baseUrl = `${environment.apiUrls.purchases}/api/contratos`;

    contratos = signal<ContratoDto[]>([]);
    proximosVencer = signal<ContratoDto[]>([]);
    cargando = signal(false);
    error = signal('');
    mostrarForm = signal(false);
    guardando = signal(false);
    filtroEstado = signal('');

    form = this.fb.group({
        proveedorId: ['', Validators.required],
        tipoContrato: ['MARCO', Validators.required],
        descripcion: ['', Validators.required],
        fechaInicio: ['', Validators.required],
        fechaFin: ['', Validators.required],
        montoContrato: [0, [Validators.required, Validators.min(0)]],
        moneda: ['PEN'],
        condicionesPago: [''],
        penalidades: [''],
        renovacionAutomatica: [false],
        diasAvisoVencimiento: [30],
    });

    private getHeaders(): HttpHeaders {
        const companyId = this.authService.currentUser()?.activeCompanyId ?? '';
        return new HttpHeaders({ 'X-Company-Id': companyId });
    }

    ngOnInit(): void { this.cargar(); }

    cargar(): void {
        this.cargando.set(true);
        const estado = this.filtroEstado();
        const url = estado ? `${this.baseUrl}?estado=${estado}` : this.baseUrl;
        this.http.get<ContratoDto[]>(url, { headers: this.getHeaders() }).subscribe({
            next: (d) => {
                this.contratos.set(d);
                this.cargando.set(false);
            },
            error: () => { this.error.set('Error al cargar contratos'); this.cargando.set(false); }
        });
        this.http.get<ContratoDto[]>(`${this.baseUrl}/proximos-vencer?dias=30`, { headers: this.getHeaders() }).subscribe({
            next: (d) => this.proximosVencer.set(d),
            error: () => {}
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.guardando.set(true);
        const v = this.form.value;
        this.http.post<ContratoDto>(this.baseUrl, v, { headers: this.getHeaders() }).subscribe({
            next: () => {
                this.guardando.set(false);
                this.mostrarForm.set(false);
                this.cargar();
            },
            error: () => { this.guardando.set(false); this.error.set('Error al crear contrato'); }
        });
    }

    rescindir(id: string): void {
        this.http.put<ContratoDto>(`${this.baseUrl}/${id}/rescindir`, {}, { headers: this.getHeaders() }).subscribe({
            next: () => this.cargar(),
            error: () => this.error.set('Error al rescindir contrato')
        });
    }

    estadoClass(estado: string): string {
        const m: Record<string, string> = {
            ACTIVO: 'badge-success', VENCIDO: 'badge-error',
            SUSPENDIDO: 'badge-warning', RESCINDIDO: 'badge-neutral',
        };
        return m[estado] ?? 'badge-neutral';
    }

    onFiltro(event: Event): void {
        const val = (event.target as HTMLSelectElement).value;
        this.filtroEstado.set(val);
        this.cargar();
    }
}
