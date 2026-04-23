import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { StoreFollowService, FollowedStoreResponse } from '@core/services/store-follow.service';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '@shared/components';

@Component({
    selector: 'app-account-followed-stores',
    standalone: true,
    imports: [RouterLink, DatePipe, BreadcrumbComponent, ButtonComponent],
    templateUrl: './account-followed-stores.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountFollowedStoresComponent implements OnInit {
    private storeFollowService = inject(StoreFollowService);

    readonly breadcrumbItems: BreadcrumbItem[] = [
        { label: 'Inicio', route: ['/home'] },
        { label: 'Mi Cuenta' },
        { label: 'Tiendas que sigues' },
    ];

    stores = signal<FollowedStoreResponse[]>([]);
    loading = signal(true);
    unfollowing = signal<number | null>(null);

    ngOnInit(): void {
        this.storeFollowService.getFollowed().subscribe({
            next: (data) => {
                this.stores.set(data.content ?? []);
                this.loading.set(false);
            },
            error: () => {
                this.stores.set([]);
                this.loading.set(false);
            },
        });
    }

    unfollow(storeId: number): void {
        this.unfollowing.set(storeId);
        this.storeFollowService.unfollow(storeId).subscribe({
            next: () => {
                this.stores.update(list => list.filter(s => s.companyId !== storeId));
                this.unfollowing.set(null);
            },
            error: () => this.unfollowing.set(null),
        });
    }
}
