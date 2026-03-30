import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ConfirmModalService {
    isOpen = signal(false);
    options = signal<ConfirmOptions>({ title: '', message: '' });

    private resolveFn?: (value: boolean) => void;

    confirm(opts: ConfirmOptions): Promise<boolean> {
        this.options.set(opts);
        this.isOpen.set(true);
        return new Promise(resolve => { this.resolveFn = resolve; });
    }

    accept() {
        this.isOpen.set(false);
        this.resolveFn?.(true);
    }

    cancel() {
        this.isOpen.set(false);
        this.resolveFn?.(false);
    }
}
