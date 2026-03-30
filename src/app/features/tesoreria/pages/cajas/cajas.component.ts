import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DrawerComponent } from '../../../../shared/components/drawer/drawer.component';
import { CajasService } from '../../services/cajas.service';
import { CashRegister } from '../../models/tesoreria.model';

@Component({
    selector: 'app-cajas',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DecimalPipe, DatePipe, FormsModule, DrawerComponent],
    templateUrl: './cajas.component.html'
})
export class CajasComponent implements OnInit {
    private cajasService = inject(CajasService);

    cajas = signal<CashRegister[]>([]);
    cargando = signal(false);
    showModal = signal(false);
    guardando = signal(false);

    formNombre = '';
    formSaldoInicial = 0;

    cajasAbiertas = computed(() => this.cajas().filter(c => c.estado === 'ABIERTA').length);
    cajasCerradas = computed(() => this.cajas().filter(c => c.estado !== 'ABIERTA').length);
    saldoTotal = computed(() =>
        this.cajas().filter(c => c.estado === 'ABIERTA').reduce((s, c) => s + (c.saldoActual || 0), 0)
    );

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.cargando.set(true);
        this.cajasService.getAll().subscribe({
            next: (res) => {
                this.cajas.set(Array.isArray(res) ? res : (res?.content ?? []));
                this.cargando.set(false);
            },
            error: () => this.cargando.set(false)
        });
    }

    openRegister(c: CashRegister): void {
        if (c.id) {
            this.cajasService.open(c.id, 0).subscribe({ next: () => this.load() });
        }
    }

    closeRegister(c: CashRegister): void {
        if (c.id) {
            this.cajasService.close(c.id).subscribe({ next: () => this.load() });
        }
    }

    crearCaja(): void {
        if (!this.formNombre.trim()) return;
        this.guardando.set(true);
        this.cajasService.create({ nombre: this.formNombre, saldoInicial: this.formSaldoInicial } as unknown as CashRegister).subscribe({
            next: () => {
                this.showModal.set(false);
                this.formNombre = '';
                this.formSaldoInicial = 0;
                this.guardando.set(false);
                this.load();
            },
            error: () => this.guardando.set(false)
        });
    }
}
