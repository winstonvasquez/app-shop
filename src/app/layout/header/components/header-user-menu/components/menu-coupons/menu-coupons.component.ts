import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-menu-coupons',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './menu-coupons.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuCoupons {}
