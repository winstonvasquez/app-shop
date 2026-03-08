import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _activeRequests = signal<number>(0);
  
  readonly isLoading = computed(() => this._activeRequests() > 0);
  readonly activeRequests = this._activeRequests.asReadonly();

  show(): void {
    this._activeRequests.update(count => count + 1);
  }

  hide(): void {
    this._activeRequests.update(count => Math.max(0, count - 1));
  }

  reset(): void {
    this._activeRequests.set(0);
  }
}
