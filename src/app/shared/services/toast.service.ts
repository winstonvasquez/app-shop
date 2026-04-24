import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration: number;
    createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
    toasts = signal<Toast[]>([]);

    private show(type: ToastType, title: string, message?: string, duration = 4000) {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const toast: Toast = { id, type, title, message, duration, createdAt: Date.now() };
        this.toasts.update(t => [...t, toast]);
        if (duration > 0) setTimeout(() => this.dismiss(id), duration);
        return id;
    }

    success(title: string, message?: string, duration?: number) {
        return this.show('success', title, message, duration);
    }

    error(title: string, message?: string, duration?: number) {
        return this.show('error', title, message, duration ?? 6000);
    }

    warning(title: string, message?: string, duration?: number) {
        return this.show('warning', title, message, duration);
    }

    info(title: string, message?: string, duration?: number) {
        return this.show('info', title, message, duration);
    }

    dismiss(id: string) {
        this.toasts.update(t => t.filter(toast => toast.id !== id));
    }

    dismissAll() {
        this.toasts.set([]);
    }
}
