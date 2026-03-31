import { Injectable, signal, computed } from '@angular/core';

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
}

@Injectable({ providedIn: 'root' })
export class UserStore {
    // Writable signal (private state)
    private _user = signal<User | null>(null);
    private _isAuthenticated = signal<boolean>(false);

    // Computed signals (public read-only)
    readonly user = computed(() => this._user());
    readonly isAuthenticated = computed(() => this._isAuthenticated());
    readonly isAdmin = computed(() => this._user()?.role === 'admin');

    constructor() {}

    login(user: User) {
        this._user.set(user);
        this._isAuthenticated.set(true);
    }

    logout() {
        this._user.set(null);
        this._isAuthenticated.set(false);
    }
}
