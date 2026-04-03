import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-menu-followed-stores',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './menu-followed-stores.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuFollowedStores {}
