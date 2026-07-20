import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DataTableComponent, TableColumn, TableAction, PaginationEvent } from '@shared/ui/tables/data-table/data-table.component';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { Sucursal, SucursalInput, SucursalService } from '@features/admin/services/sucursal.service';

@Component({
    selector: 'app-sucursales',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, DataTableComponent],
    templateUrl: './sucursales.component.html',
    styleUrl: './sucursales.component.scss',
})
export class SucursalesComponent implements OnInit {
    private readonly svc = inject(SucursalService);
    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);

    sucursales = signal<Sucursal[]>([]);

    // Búsqueda por botón + paginación client-side (tabla estándar)
    searchQuery = signal('');
    currentPage = signal(0);
    pageSize = signal(20);

    readonly filtradas = computed(() => {
        const q = this.searchQuery().toLowerCase();
        if (!q) return this.sucursales();
        return this.sucursales().filter(s =>
            s.nombre.toLowerCase().includes(q) ||
            (s.direccion ?? '').toLowerCase().includes(q));
    });
    readonly totalElements = computed(() => this.filtradas().length);
    readonly totalPages = computed(() => Math.ceil(this.totalElements() / this.pageSize()) || 1);
    readonly pagedData = computed(() => {
        const start = this.currentPage() * this.pageSize();
        return this.filtradas().slice(start, start + this.pageSize());
    });

    columns: TableColumn<Sucursal>[] = [
        { key: 'nombre', label: 'Nombre', sortable: true, html: true,
          render: (s) => `<strong>${s.nombre}</strong>` },
        { key: 'direccion', label: 'Dirección',
          render: (s) => (s.direccion || '—') + (s.ubigeo ? ` · ubigeo ${s.ubigeo}` : '') },
        { key: 'serieBoleta', label: 'Series CPE',
          render: (s) => `${s.serieBoleta || '—'} / ${s.serieFactura || '—'}` },
        { key: 'activo', label: 'Estado', html: true,
          render: (s) => `<span class="badge ${s.activo ? 'badge-success' : 'badge-neutral'}">${s.activo ? 'Activa' : 'Inactiva'}</span>` }
    ];

    actions: TableAction<Sucursal>[] = [
        { label: 'Editar', icon: 'edit', class: 'btn-icon-edit', onClick: (s) => this.openEdit(s) },
        { label: 'Desactivar', icon: 'delete', class: 'btn-icon-delete',
          show: (s) => s.activo, onClick: (s) => this.deactivate(s) }
    ];

    onSearchTerm(term: string): void {
        this.searchQuery.set(term);
        this.currentPage.set(0);
    }

    onPageChange(e: PaginationEvent): void {
        this.currentPage.set(e.page);
        this.pageSize.set(e.size);
    }
    loading = signal(false);
    error = signal<string | null>(null);

    showForm = signal(false);
    editingId = signal<number | null>(null);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    form: FormGroup = this.fb.group({
        nombre: ['', Validators.required],
        direccion: [''],
        ubigeo: [''],
        telefono: [''],
        serieBoleta: [''],
        serieFactura: [''],
    });

    activas = computed(() => this.sucursales().filter(s => s.activo));
    total = computed(() => this.sucursales().length);

    ngOnInit() { this.load(); }

    private currentCompanyId(): number {
        return this.auth.currentUser()?.activeCompanyId ?? 1;
    }

    load() {
        this.loading.set(true);
        this.error.set(null);
        this.svc.list(this.currentCompanyId()).subscribe({
            next: list => { this.sucursales.set(list); this.loading.set(false); },
            error: err => {
                this.error.set(err?.error?.detail ?? 'Error cargando sucursales');
                this.loading.set(false);
            },
        });
    }

    openCreate() {
        this.editingId.set(null);
        this.form.reset();
        this.showForm.set(true);
    }

    openEdit(s: Sucursal) {
        this.editingId.set(s.id);
        this.form.patchValue({
            nombre: s.nombre,
            direccion: s.direccion ?? '',
            ubigeo: s.ubigeo ?? '',
            telefono: s.telefono ?? '',
            serieBoleta: s.serieBoleta ?? '',
            serieFactura: s.serieFactura ?? '',
        });
        this.showForm.set(true);
    }

    cancel() {
        this.showForm.set(false);
        this.submitError.set(null);
    }

    submit() {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.submitting.set(true);
        this.submitError.set(null);

        const input: SucursalInput = {
            companyId: this.currentCompanyId(),
            ...this.form.value,
        };

        const id = this.editingId();
        const op$ = id ? this.svc.update(id, input) : this.svc.create(input);
        op$.subscribe({
            next: () => {
                this.submitting.set(false);
                this.showForm.set(false);
                this.load();
            },
            error: err => {
                this.submitting.set(false);
                this.submitError.set(err?.error?.detail ?? 'Error al guardar');
            },
        });
    }

    deactivate(s: Sucursal) {
        if (!confirm(`¿Desactivar sucursal "${s.nombre}"?`)) return;
        this.svc.deactivate(s.id).subscribe({
            next: () => this.load(),
            error: err => this.error.set(err?.error?.detail ?? 'Error al desactivar'),
        });
    }
}
