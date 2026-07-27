import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CouponService, CuponResponse, MisCuponesFiltros } from '@core/services/coupon.service';
import { AuthService } from '@core/auth/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { DsAccountShellComponent, DsButtonComponent, DsBadgeComponent, DsInputComponent } from '@shared/ui/ds';

type CuponTab = 'ACTIVE' | 'USED' | 'EXPIRED';

@Component({
    selector: 'app-account-coupons',
    standalone: true,
    imports: [
        DatePipe,
        FormsModule,
        LucideAngularModule,
        DsAccountShellComponent,
        DsButtonComponent,
        DsBadgeComponent,
        DsInputComponent,
    ],
    templateUrl: './account-coupons.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountCouponsComponent implements OnInit {
    private couponService = inject(CouponService);
    private authService   = inject(AuthService);
    readonly catalog       = inject(CatalogService);

    userName = computed(() => this.authService.currentUser()?.username ?? '');

    /**
     * Página actual de cupones YA filtrada por el backend (search/tipo/status/rangos).
     * NUNCA se filtra en la vista — `status` es un valor derivado pero el backend lo
     * resuelve en la query (ver `ClienteCuponRepository.findMineWithFilters`).
     */
    cupones   = signal<CuponResponse[]>([]);
    loading   = signal(true);
    activeTab = signal<CuponTab>('ACTIVE');
    copiedId  = signal<number | null>(null);

    currentPage = signal(0);
    totalPages  = signal(0);

    // ── Filtros adicionales (server-side) ───────────────────────────
    readonly searchQuery         = signal('');
    readonly filterTipo          = signal('');
    readonly filterFechaFinDesde = signal('');
    readonly filterFechaFinHasta = signal('');
    readonly filterAssignedDesde = signal('');
    readonly filterAssignedHasta = signal('');

    readonly tiposDescuento = this.catalog.options('TIPO_DESCUENTO');

    readonly hasActiveFilters = computed(() =>
        !!(this.searchQuery() || this.filterTipo() || this.filterFechaFinDesde() || this.filterFechaFinHasta()
            || this.filterAssignedDesde() || this.filterAssignedHasta())
    );

    readonly tabs: { key: CuponTab; label: string }[] = [
        { key: 'ACTIVE',  label: 'Disponibles' },
        { key: 'USED',    label: 'Usados' },
        { key: 'EXPIRED', label: 'Vencidos' },
    ];

    ngOnInit(): void {
        this.load();
    }

    private load(): void {
        this.loading.set(true);
        const filtros: MisCuponesFiltros = {
            search: this.searchQuery() || undefined,
            tipo: this.filterTipo() || undefined,
            status: this.activeTab(),
            fechaFinDesde: this.filterFechaFinDesde() || undefined,
            fechaFinHasta: this.filterFechaFinHasta() || undefined,
            assignedAtDesde: this.filterAssignedDesde() || undefined,
            assignedAtHasta: this.filterAssignedHasta() || undefined,
        };
        this.couponService.getMyCupones(this.currentPage(), 20, filtros).subscribe({
            next: (data) => {
                this.cupones.set(data.content ?? []);
                this.totalPages.set(data.totalPages ?? 0);
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
    }

    setTab(tab: CuponTab): void {
        this.activeTab.set(tab);
        this.currentPage.set(0);
        this.load();
    }

    onSearch(value: string): void {
        this.searchQuery.set(value);
        this.currentPage.set(0);
        this.load();
    }

    onTipoChange(value: string): void {
        this.filterTipo.set(value);
        this.currentPage.set(0);
        this.load();
    }

    onFechaFinDesdeChange(value: string): void {
        this.filterFechaFinDesde.set(value);
        this.currentPage.set(0);
        this.load();
    }

    onFechaFinHastaChange(value: string): void {
        this.filterFechaFinHasta.set(value);
        this.currentPage.set(0);
        this.load();
    }

    onAssignedDesdeChange(value: string): void {
        this.filterAssignedDesde.set(value);
        this.currentPage.set(0);
        this.load();
    }

    onAssignedHastaChange(value: string): void {
        this.filterAssignedHasta.set(value);
        this.currentPage.set(0);
        this.load();
    }

    /** "Limpiar filtros": resetea todo (menos la pestaña activa) y recarga UNA sola vez. */
    onFiltersClear(): void {
        this.searchQuery.set('');
        this.filterTipo.set('');
        this.filterFechaFinDesde.set('');
        this.filterFechaFinHasta.set('');
        this.filterAssignedDesde.set('');
        this.filterAssignedHasta.set('');
        this.currentPage.set(0);
        this.load();
    }

    prevPage(): void { if (this.currentPage() > 0) { this.currentPage.update(p => p - 1); this.load(); } }
    nextPage(): void { if (this.currentPage() < this.totalPages() - 1) { this.currentPage.update(p => p + 1); this.load(); } }

    copyCode(coupon: CuponResponse): void {
        if (!coupon.codigo) return;
        navigator.clipboard.writeText(coupon.codigo).then(() => {
            this.copiedId.set(coupon.id);
            setTimeout(() => this.copiedId.set(null), 2000);
        });
    }

    formatDiscount(c: CuponResponse): string {
        return c.tipo === 'PORCENTAJE' ? `${c.valor}% OFF` : `S/ ${c.valor.toFixed(2)} OFF`;
    }
}
