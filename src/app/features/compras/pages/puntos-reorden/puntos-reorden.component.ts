import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EvaluacionService } from '../../services/evaluacion.service';
import { ProveedorService } from '../../services/proveedor.service';
import { PuntoReorden } from '../../models/evaluacion.model';
import { Proveedor } from '../../models/proveedor.model';

@Component({
    selector: 'app-puntos-reorden',
    standalone: true,
    imports: [NgClass, ReactiveFormsModule],
    templateUrl: './puntos-reorden.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PuntosReordenComponent implements OnInit {
    private service = inject(EvaluacionService);
    private proveedorService = inject(ProveedorService);
    private fb = inject(FormBuilder);

    proveedores = signal<Proveedor[]>([]);
    items = signal<PuntoReorden[]>([]);
    loading = signal(false);
    showForm = signal(false);
    saving = signal(false);
    soloAlerta = signal(false);
    editingStock = signal<string | null>(null);
    nuevoStock = signal(0);

    form: FormGroup = this.fb.group({
        productoId: ['', Validators.required],
        sku: ['', Validators.required],
        productoNombre: ['', Validators.required],
        proveedorId: [''],
        stockMinimo: [5, [Validators.required, Validators.min(0)]],
        puntoReorden: [10, [Validators.required, Validators.min(0)]],
        cantidadSugerida: [20, [Validators.required, Validators.min(1)]],
    });

    ngOnInit(): void {
        this.cargar();
        this.proveedorService.getProveedores(0, 200).subscribe(r => {
            this.proveedores.set(r.content ?? []);
        });
    }

    cargar(): void {
        this.loading.set(true);
        const obs = this.soloAlerta()
            ? this.service.listarQueRequierenReorden()
            : this.service.listarPuntosReorden();
        obs.subscribe({
            next: data => { this.items.set(data); this.loading.set(false); },
            error: () => this.loading.set(false),
        });
    }

    toggleFiltro(): void {
        this.soloAlerta.update(v => !v);
        this.cargar();
    }

    iniciarEditStock(item: PuntoReorden): void {
        this.editingStock.set(item.id);
        this.nuevoStock.set(item.stockActual);
    }

    guardarStock(id: string): void {
        this.service.actualizarStock(id, this.nuevoStock()).subscribe({
            next: updated => {
                this.items.update(list => list.map(i => i.id === id ? updated : i));
                this.editingStock.set(null);
            },
        });
    }

    guardar(): void {
        if (this.form.invalid) return;
        this.saving.set(true);
        const v = this.form.value;
        this.service.crearPuntoReorden(v).subscribe({
            next: p => {
                this.items.update(list => [p, ...list]);
                this.form.reset({ stockMinimo: 5, puntoReorden: 10, cantidadSugerida: 20 });
                this.showForm.set(false);
                this.saving.set(false);
            },
            error: () => this.saving.set(false),
        });
    }
}
