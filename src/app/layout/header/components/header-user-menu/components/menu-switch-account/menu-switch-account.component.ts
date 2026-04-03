import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { AuthService } from '@core/auth/auth.service';
import { LoginResponse } from '@core/auth/auth.model';

interface CompanyOption {
    companyId: number;
    companyName: string;
    ruc: string;
    isActive: boolean;
}

@Component({
    selector: 'app-menu-switch-account',
    standalone: true,
    imports: [],
    templateUrl: './menu-switch-account.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuSwitchAccount implements OnInit {
    private http = inject(HttpClient);
    private authService = inject(AuthService);

    companies = signal<CompanyOption[]>([]);
    switching = signal<number | null>(null);

    get currentCompanyId(): number | undefined {
        return this.authService.currentUser()?.activeCompanyId ?? undefined;
    }

    ngOnInit(): void {
        this.http.get<CompanyOption[]>(`${environment.apiUrls.users}/api/users/me/companies`).subscribe({
            next: (data) => this.companies.set(data),
            error: () => {}
        });
    }

    switch(companyId: number): void {
        if (companyId === this.currentCompanyId || this.switching() !== null) return;
        this.switching.set(companyId);
        this.http.post<LoginResponse>(
            `${environment.apiUrls.users}/api/users/me/companies/switch`,
            { targetCompanyId: companyId }
        ).subscribe({
            next: (response) => {
                this.authService.setSessionFromResponse(response);
                this.switching.set(null);
                window.location.reload();
            },
            error: () => this.switching.set(null)
        });
    }
}
