import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-menu-notifications',
  standalone: true,
  imports: [],
  templateUrl: './menu-notifications.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuNotifications implements OnInit {
  private router = inject(Router);
  readonly notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.notificationService.startPolling();
  }

  navigate(): void {
    this.router.navigate(['/account/notifications']);
  }
}
