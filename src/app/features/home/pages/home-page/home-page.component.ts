import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PromoBannerComponent, Banner as CarouselBanner } from '@shared/components/promo-banner/promo-banner.component';
import { FlashDealsSectionComponent } from '@features/home/components/flash-deals-section/flash-deals-section.component';
import { CategoryService } from '@core/services/category.service';
import { BannerService, Banner } from '@features/home/services/banner.service';
import { SearchService } from '@shared/services/search.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    PromoBannerComponent,
    FlashDealsSectionComponent,
    TranslateModule
  ],
  templateUrl: './home-page.component.html'
})
export class HomePageComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private bannerService = inject(BannerService);
  private searchService = inject(SearchService);

  categories = signal<any[]>([]);
  banners = signal<Banner[]>([]);

  // Transform backend banners to carousel format
  carouselBanners = signal<CarouselBanner[]>([]);

  constructor() {
    effect(() => {
    });
  }

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.categoryService.getAllSimple().subscribe(cats => this.categories.set(cats));
    this.bannerService.getAll().subscribe({
      next: (banners) => {
        this.banners.set(banners);
        const carouselBanners = banners.map(b => ({
          id: b.id,
          title: b.titulo,
          subtitle: b.subtitulo,
          ctaText: 'home.viewAll',
          imageUrl: b.imagenUrl
        }));
        this.carouselBanners.set(carouselBanners.length ? carouselBanners : this.getFallbackBanners());
      },
      error: () => this.carouselBanners.set(this.getFallbackBanners())
    });
  }

  private getFallbackBanners() {
    return [{
      id: 1,
      title: 'Sports Season',
      subtitle: 'Gear Up for Adventure — Fitness & Outdoor Equipment',
      ctaText: 'home.viewAll',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400&h=600&fit=crop&q=80'
    }];
  }
}
