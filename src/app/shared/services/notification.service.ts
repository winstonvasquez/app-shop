import { Injectable, signal } from '@angular/core';
import { NOTIFICATION_DURATION, NOTIFICATION_TYPES } from '../constants/ui.constants';

export interface Notification {
  id: string;
  type: keyof typeof NOTIFICATION_TYPES;
  messageKey: string;
  messageTranslated?: string;
  duration?: number;
  dismissible?: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private show(
    type: keyof typeof NOTIFICATION_TYPES,
    messageKey: string,
    messageTranslated?: string,
    duration: number = NOTIFICATION_DURATION.medium,
    dismissible: boolean = true
  ): void {
    const notification: Notification = {
      id: this.generateId(),
      type,
      messageKey,
      messageTranslated,
      duration,
      dismissible,
    };

    this._notifications.update(notifications => [...notifications, notification]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(notification.id);
      }, duration);
    }
  }

  showSuccess(
    messageKey: string,
    messageTranslated?: string,
    duration?: number
  ): void {
    this.show(
      NOTIFICATION_TYPES.success,
      messageKey,
      messageTranslated,
      duration || NOTIFICATION_DURATION.medium
    );
  }

  showError(
    messageKey: string,
    messageTranslated?: string,
    duration?: number
  ): void {
    this.show(
      NOTIFICATION_TYPES.error,
      messageKey,
      messageTranslated,
      duration || NOTIFICATION_DURATION.long
    );
  }

  showWarning(
    messageKey: string,
    messageTranslated?: string,
    duration?: number
  ): void {
    this.show(
      NOTIFICATION_TYPES.warning,
      messageKey,
      messageTranslated,
      duration || NOTIFICATION_DURATION.medium
    );
  }

  showInfo(
    messageKey: string,
    messageTranslated?: string,
    duration?: number
  ): void {
    this.show(
      NOTIFICATION_TYPES.info,
      messageKey,
      messageTranslated,
      duration || NOTIFICATION_DURATION.medium
    );
  }

  dismiss(id: string): void {
    this._notifications.update(notifications =>
      notifications.filter(n => n.id !== id)
    );
  }

  dismissAll(): void {
    this._notifications.set([]);
  }
}
