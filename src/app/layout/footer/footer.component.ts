import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, merge } from 'rxjs';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './footer.component.html',
  host: { class: 'block w-full' }
})
export class FooterComponent implements OnInit, OnDestroy {
  private translate = inject(TranslateService);
  private langSub?: Subscription;

  // Section headings
  companyInfoTitle = signal('');
  helpSupportTitle = signal('');
  legalTitle = signal('');
  downloadAppTitle = signal('');
  paymentMethodsTitle = signal('');
  shopAnywhereLabel = signal('');
  getItOnLabel = signal('');
  availableOnLabel = signal('');
  allRightsLabel = signal('');
  privacyLabel = signal('');
  termsLabel = signal('');

  // Link labels
  companyLinks = signal<{ label: string; url: string }[]>([]);
  helpLinks = signal<{ label: string; url: string }[]>([]);
  legalLinks = signal<{ label: string; url: string }[]>([]);

  paymentMethods = [
    { name: 'Visa', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg' },
    { name: 'Mastercard', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg' },
    { name: 'Amex', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg' },
    { name: 'PayPal', icon: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg' }
  ];

  ngOnInit() {
    this.updateTranslations();
    this.langSub = merge(
      this.translate.onTranslationChange,
      this.translate.onLangChange
    ).subscribe(() => this.updateTranslations());
  }

  ngOnDestroy() { this.langSub?.unsubscribe(); }

  private t(key: string): string {
    const v = this.translate.instant(key);
    return v === key ? '' : v;
  }

  private updateTranslations() {
    this.companyInfoTitle.set(this.t('footer.companyInfo'));
    this.helpSupportTitle.set(this.t('footer.helpSupport'));
    this.legalTitle.set(this.t('footer.legal'));
    this.downloadAppTitle.set(this.t('footer.downloadApp'));
    this.paymentMethodsTitle.set(this.t('footer.paymentMethods'));
    this.shopAnywhereLabel.set(this.t('footer.shopAnywhere'));
    this.getItOnLabel.set(this.t('footer.getItOn'));
    this.availableOnLabel.set(this.t('footer.availableOn'));
    this.allRightsLabel.set(this.t('footer.allRightsReserved'));
    this.privacyLabel.set(this.t('footer.privacyPolicy'));
    this.termsLabel.set(this.t('footer.termsOfUse'));

    this.companyLinks.set([
      { label: this.t('footer.links.about'), url: '#' },
      { label: this.t('footer.links.affiliate'), url: '#' },
      { label: this.t('footer.links.sell'), url: '#' },
      { label: this.t('footer.links.press'), url: '#' }
    ]);
    this.helpLinks.set([
      { label: this.t('footer.help.center'), url: '#' },
      { label: this.t('footer.help.status'), url: '#' },
      { label: this.t('footer.help.returns'), url: '#' },
      { label: this.t('footer.help.report'), url: '#' }
    ]);
    this.legalLinks.set([
      { label: this.t('footer.legalLinks.terms'), url: '#' },
      { label: this.t('footer.legalLinks.privacy'), url: '#' },
      { label: this.t('footer.legalLinks.data'), url: '#' },
      { label: this.t('footer.legalLinks.accessibility'), url: '#' }
    ]);
  }
}
