import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageSelectorComponent } from '@shared/components/language-selector/language-selector.component';
import { Subscription, merge } from 'rxjs';
import { SystemParameterService } from '@core/services/system-parameter.service';

@Component({
    selector: 'app-header-bar-help',
    standalone: true,
    imports: [CommonModule, TranslateModule, LanguageSelectorComponent],
    templateUrl: './header-bar-help.component.html',
    host: { class: 'block w-full' }
})
export class HeaderBarHelpComponent implements OnInit, OnDestroy {
    private translate = inject(TranslateService);
    public systemParams = inject(SystemParameterService);
    private langSub?: Subscription;



    helpLabel = signal(this.t('header.help'));

    ngOnInit() {
        this.langSub = merge(
            this.translate.onTranslationChange,
            this.translate.onLangChange
        ).subscribe(() => {
            this.helpLabel.set(this.t('header.help'));
        });
    }

    ngOnDestroy() { this.langSub?.unsubscribe(); }

    private t(key: string): string {
        return this.translate.instant(key);
    }
}
