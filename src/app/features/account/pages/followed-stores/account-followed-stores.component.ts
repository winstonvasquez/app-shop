import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '@core/auth/auth.service';
import { StoreFollowService, FollowedStoreResponse } from '@core/services/store-follow.service';
import { DsAccountShellComponent, DsButtonComponent } from '@shared/ui/ds';

@Component({
    selector: 'app-account-followed-stores',
    standalone: true,
    imports: [RouterLink, DatePipe, LucideAngularModule, DsAccountShellComponent, DsButtonComponent],
    templateUrl: './account-followed-stores.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountFollowedStoresComponent implements OnInit {
    private authService = inject(AuthService);
    private storeFollowService = inject(StoreFollowService);

    userName = computed(() => this.authService.currentUser()?.username ?? '');

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
