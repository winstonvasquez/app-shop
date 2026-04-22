import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { KardexService } from '../../services/kardex.service';
import { KardexEntry } from '../../models/kardex.model';

@Component({
    selector: 'app-kardex',
    standalone: true,
    imports: [ReactiveFormsModule, DecimalPipe, DatePipe],
    templateUrl: './kardex.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KardexComponent {
    private readonly kardexService = inject(KardexService);
    private readonly fb = inject(FormBuilder);

    filterForm = this.fb.group({
        productoId: ['', [Validators.required]],
        almacenId:  [''],
        fromDate:   [''],
        toDate:     ['']
    });

    loading  = signal(false);
    error    = signal<string | null>(null);
    entries  = signal<KardexEntry[]>([]);
    searched = signal(false);

    saldoFinal = computed(() => {
        const list = this.entries();
        if (list.length === 0) return 0;
        return list[list.length - 1].saldoCantidad;
    });

    valorFinal = computed(() => {
        const list = this.entries();
        if (list.length === 0) return 0;
        return list[list.length - 1].saldoValor;
    });

    buscar(): void {
        const { productoId, almacenId, fromDate, toDate } = this.filterForm.value;
        if (!productoId) {
            this.error.set('Ingresa el ID del producto');
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        this.kardexService.getEntries({
            productoId: productoId,
            almacenId:  almacenId  || undefined,
            from:       fromDate   || undefined,
            to:         toDate     || undefined,
            size: 100
        }).subscribe({
            next: (page) => {
                this.entries.set(page.content);
                this.searched.set(true);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Error al cargar el kardex');
                this.loading.set(false);
            }
        });
    }

    tipoClass(tipo: string): string {
        switch (tipo) {
            case 'ENTRADA':  return 'bg-success/10 text-success';
            case 'SALIDA':   return 'bg-error/10 text-error';
            case 'AJUSTE':   return 'bg-warning/10 text-warning';
            case 'TRASLADO': return 'bg-info/10 text-info';
            default:         return 'bg-gray-100 text-gray-600';
        }
    }
}
