import {
    Component, DestroyRef, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { CajasService } from '../../services/cajas.service';
import { CashRegister, Page } from '../../models/tesoreria.model';

@Component({
    selector: 'app-cajas',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DecimalPipe, ReactiveFormsModule,
        DrawerComponent, DataTableComponent, PageHeaderComponent, FormFieldComponent
    ],
    templateUrl: './cajas.component.html'
})
export class CajasComponent implements OnInit {
    private cajasService = inject(CajasService);
    private fb           = inject(FormBuilder);
    private destroyRef   = inject(DestroyRef);

    cajas         = signal<CashRegister[]>([]);
    cargando      = signal(false);
    guardando     = signal(false);
    errorMsg      = signal<string | null>(null);
    actionErrorMsg = signal<string | null>(null);

    currentPage   = signal(0);
    pageSize      = signal(10);
    totalElements = signal(0);
    totalPages    = signal(0);

    showCreateDrawer = signal(false);
    showActionDrawer = signal(false);
    selectedCaja     = signal<CashRegister | null>(null);
    actionType       = signal<'abrir' | 'cerrar'>('abrir');

    createForm: FormGroup = this.fb.group({
        nombre:       ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
        saldoInicial: [0,  [Validators.required, Validators.min(0)]]
    });

    actionForm: FormGroup = this.fb.group({
        saldoInicial: [0, [Validators.required, Validators.min(0)]]
    });

    cajasAbiertas = computed(() => this.cajas().filter(c => c.estado === 'ABIERTA').length);
    cajasCerradas = computed(() => this.cajas().filter(c => c.estado !== 'ABIERTA').length);
    saldoTotal    = computed(() =>
        this.cajas().filter(c => c.estado === 'ABIERTA').reduce((s, c) => s + (c.saldoActual ?? 0), 0)
    );

    columns: TableColumn<CashRegister>[] = [
        { key: 'nombre',        label: 'Nombre',        sortable: true },
        { key: 'estado',        label: 'Estado',        align: 'center', html: true,
          render: r => `<span class="${r.estado === 'ABIERTA' ? 'badge badge-success' : 'badge badge-neutral'}">${r.estado}</span>` },
        { key: 'saldoActual',   label: 'Saldo Actual',  align: 'right',
          render: r => `S/ ${(r.saldoActual ?? 0).toFixed(2)}` },
        { key: 'saldoInicial',  label: 'Saldo Inicial', align: 'right',
          render: r => `S/ ${(r.saldoInicial ?? 0).toFixed(2)}` },
        { key: 'fechaApertura', label: 'Apertura',
          render: r => r.fechaApertura ? new Date(r.fechaApertura).toLocaleDateString('es-PE') : '—' },
    ];

    actions: TableAction<CashRegister>[] = [
        { label: 'Abrir',  icon: '🔓', class: 'btn-view',
          show: r => r.estado !== 'ABIERTA',
          onClick: r => this.openActionDrawer(r, 'abrir') },
        { label: 'Cerrar', icon: '🔒', class: 'btn-view',
          show: r => r.estado === 'ABIERTA',
          onClick: r => this.openActionDrawer(r, 'cerrar') },
    ];

    ngOnInit(): void { this.load(); }

    load(): void {
        this.cargando.set(true);
        this.cajasService.getAll(this.currentPage(), this.pageSize())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res: Page<CashRegister> | CashRegister[]) => {
                    const data = Array.isArray(res) ? res : (res as Page<CashRegister>).content;
                    this.cajas.set(data);
                    this.totalElements.set(Array.isArray(res) ? data.length : (res as Page<CashRegister>).totalElements);
                    this.totalPages.set(Array.isArray(res) ? 1 : (res as Page<CashRegister>).totalPages);
                    this.cargando.set(false);
                },
                error: () => this.cargando.set(false)
            });
    }

    onPageChange(event: { page: number; size: number }): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.load();
    }

    openCreateDrawer(): void {
        this.createForm.reset({ nombre: '', saldoInicial: 0 });
        this.errorMsg.set(null);
        this.showCreateDrawer.set(true);
    }

    openActionDrawer(caja: CashRegister, tipo: 'abrir' | 'cerrar'): void {
        this.selectedCaja.set(caja);
        this.actionType.set(tipo);
        this.actionForm.reset({ saldoInicial: 0 });
        this.actionErrorMsg.set(null);
        this.showActionDrawer.set(true);
    }

    crearCaja(): void {
        if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
        this.guardando.set(true);
        this.cajasService.create(this.createForm.value)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => { this.showCreateDrawer.set(false); this.guardando.set(false); this.load(); },
                error: (err: { error?: { detail?: string } }) => {
                    this.errorMsg.set(err?.error?.detail ?? 'Error al crear caja');
                    this.guardando.set(false);
                }
            });
    }

    ejecutarAccion(): void {
        const caja = this.selectedCaja();
        if (!caja?.id) return;
        this.guardando.set(true);
        const op = this.actionType() === 'abrir'
            ? this.cajasService.open(caja.id, this.actionForm.value.saldoInicial ?? 0)
            : this.cajasService.close(caja.id);
        op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => { this.showActionDrawer.set(false); this.guardando.set(false); this.load(); },
            error: (err: { error?: { detail?: string } }) => {
                this.actionErrorMsg.set(err?.error?.detail ?? 'Error al ejecutar operación');
                this.guardando.set(false);
            }
        });
    }

    getControl(form: FormGroup, name: string): FormControl {
        return form.get(name) as FormControl;
    }
}
