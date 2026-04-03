import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CouponService, CuponResponse } from '@core/services/coupon.service';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';

type CuponTab = 'ACTIVE' | 'USED' | 'EXPIRED';

@Component({
    selector: 'app-account-coupons',
    standalone: true,
    imports: [RouterLink, DatePipe, BreadcrumbComponent],
    templateUrl: './account-coupons.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountCouponsComponent implements OnInit {
    private couponService = inject(CouponService);

    readonly breadcrumbItems: BreadcrumbItem[] = [
        { label: 'Inicio', route: ['/home'] },
        { label: 'Mi Cuenta' },
        { label: 'Cupones y ofertas' },
    ];

    all = signal<CuponResponse[]>([]);
    loading = signal(true);
    activeTab = signal<CuponTab>('ACTIVE');
    copiedId = signal<number | null>(null);

    readonly filtered = computed(() =>
        this.all().filter(c => c.status === this.activeTab())
    );

    ngOnInit(): void {
        this.couponService.getMyCupones().subscribe({
            next: (data) => {
                this.all.set(data.content ?? []);
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
    }

    setTab(tab: CuponTab): void {
        this.activeTab.set(tab);
    }

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
