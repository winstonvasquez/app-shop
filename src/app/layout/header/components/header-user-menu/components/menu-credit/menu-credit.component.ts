import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { CreditService } from '@core/services/credit.service';

@Component({
    selector: 'app-menu-credit',
    standalone: true,
    imports: [RouterLink, DecimalPipe],
    templateUrl: './menu-credit.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuCredit implements OnInit {
    readonly creditService = inject(CreditService);

    ngOnInit(): void {
        this.creditService.loadBalance();
    }
}
