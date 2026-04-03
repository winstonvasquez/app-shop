import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface FollowedStoreResponse {
    companyId: number;
    name: string;
    domain: string | null;
    followedAt: string;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export interface FollowStatusResponse {
    isFollowing: boolean;
    followerCount: number;
}

@Injectable({ providedIn: 'root' })
export class StoreFollowService {
    private http = inject(HttpClient);
    private readonly base = `${environment.apiUrls.sales}/api/stores`;

    getFollowed(page = 0, size = 12): Observable<PageResponse<FollowedStoreResponse>> {
        return this.http.get<PageResponse<FollowedStoreResponse>>(
            `${this.base}/followed`, { params: { page, size } }
        );
    }

    follow(storeId: number): Observable<void> {
        return this.http.post<void>(`${this.base}/${storeId}/follow`, {});
    }

    unfollow(storeId: number): Observable<void> {
        return this.http.delete<void>(`${this.base}/${storeId}/follow`);
    }

    getFollowStatus(storeId: number): Observable<FollowStatusResponse> {
        return this.http.get<FollowStatusResponse>(`${this.base}/${storeId}/follow-status`);
    }
}
