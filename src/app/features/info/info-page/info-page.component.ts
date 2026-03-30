import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, merge } from 'rxjs';
import { StoreConfigService, TiendaPaginaDto } from '@core/services/store-config.service';

/** Configuración de cada página informativa */
interface PageConfig {
  titleKey:    string;
  subtitleKey: string;
  iconPath:    string;
}

const PAGE_MAP: Record<string, PageConfig> = {
  'envios':        { titleKey: 'info.envios.title',        subtitleKey: 'info.envios.subtitle',        iconPath: 'M1 3h15v13H1z M16 8h4l3 3v5h-7V8z M5.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M18.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z' },
  'devoluciones':  { titleKey: 'info.devoluciones.title',  subtitleKey: 'info.devoluciones.subtitle',  iconPath: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5 M12 7v5l4 2' },
  'nosotros':      { titleKey: 'info.nosotros.title',      subtitleKey: 'info.nosotros.subtitle',      iconPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  'afiliados':     { titleKey: 'info.afiliados.title',     subtitleKey: 'info.afiliados.subtitle',     iconPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  'vender':        { titleKey: 'info.vender.title',        subtitleKey: 'info.vender.subtitle',        iconPath: 'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' },
  'prensa':        { titleKey: 'info.prensa.title',        subtitleKey: 'info.prensa.subtitle',        iconPath: 'M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2 M18 14h-8 M15 18h-5 M10 6h8v4h-8z' },
  'ayuda':         { titleKey: 'info.ayuda.title',         subtitleKey: 'info.ayuda.subtitle',         iconPath: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  'pedidos':       { titleKey: 'info.pedidos.title',       subtitleKey: 'info.pedidos.subtitle',       iconPath: 'M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 1 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14 M16.5 9.4 7.55 4.24 M3.29 7 12 12l8.71-5 M12 22V12 M21.5 16a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0z M21.5 16l-2 2-1-1' },
  'reporte':       { titleKey: 'info.reporte.title',       subtitleKey: 'info.reporte.subtitle',       iconPath: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01' },
  'terminos':      { titleKey: 'info.terminos.title',      subtitleKey: 'info.terminos.subtitle',      iconPath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8' },
  'privacidad':    { titleKey: 'info.privacidad.title',    subtitleKey: 'info.privacidad.subtitle',    iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  'datos':         { titleKey: 'info.datos.title',         subtitleKey: 'info.datos.subtitle',         iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4' },
  'accesibilidad': { titleKey: 'info.accesibilidad.title', subtitleKey: 'info.accesibilidad.subtitle', iconPath: 'M17 18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10z M12 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M5 8h14' },
  'descarga-app':  { titleKey: 'info.descarga-app.title', subtitleKey: 'info.descarga-app.subtitle',  iconPath: 'M12 18.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M12 11.5v4 M10 13.5l2 2 2-2 M8 3.5h8 M8 20.5h8' },
};

@Component({
  selector: 'app-info-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterLink],
  templateUrl: './info-page.component.html',
})
export class InfoPageComponent implements OnInit, OnDestroy {
  private route     = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  public  sc        = inject(StoreConfigService);
  private langSub?: Subscription;
  private routeSub?: Subscription;

  slug      = signal<string>('');
  title     = signal('');
  subtitle  = signal('');
  loading   = signal(false);
  pageData  = signal<TiendaPaginaDto | null>(null);

  config = computed<PageConfig | null>(() => PAGE_MAP[this.slug()] ?? null);

  /** Contenido HTML desde el backend, o null si no está configurado */
  content = computed<string | null>(() => {
    const data = this.pageData();
    return data?.contenido?.trim() ? data.contenido : null;
  });

  ngOnInit() {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const s = params.get('slug') ?? '';
      this.slug.set(s);
      this.updateLabels(s);
      this.loadPageContent(s);
    });
    this.langSub = merge(
      this.translate.onTranslationChange,
      this.translate.onLangChange
    ).subscribe(event => {
      const lang = typeof event === 'object' && 'lang' in event ? (event as { lang: string }).lang : this.translate.currentLang;
      this.updateLabels(this.slug());
      this.loadPageContent(this.slug(), lang);
    });
  }

  ngOnDestroy() {
    this.langSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  private loadPageContent(slug: string, locale?: string) {
    if (!slug) return;
    const lang = locale ?? this.translate.currentLang ?? 'es';
    this.loading.set(true);
    this.sc.getPageContent(slug, lang).subscribe(data => {
      this.pageData.set(data);
      this.loading.set(false);
    });
  }

  private updateLabels(slug: string) {
    const cfg = PAGE_MAP[slug];
    if (cfg) {
      this.title.set(this.translate.instant(cfg.titleKey));
      this.subtitle.set(this.translate.instant(cfg.subtitleKey));
    } else {
      this.title.set(this.translate.instant('info.notFound.title'));
      this.subtitle.set(this.translate.instant('info.notFound.subtitle'));
    }
  }
}
