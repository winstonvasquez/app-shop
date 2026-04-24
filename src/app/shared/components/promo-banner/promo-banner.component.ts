import { Component, input, signal, OnInit, OnDestroy, effect, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

export interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  imageUrl: string;
}

@Component({
  selector: 'app-promo-banner',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  templateUrl: './promo-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromoBannerComponent implements OnInit, OnDestroy {
  // Input for multiple banners
  banners = input<Banner[]>([

  ]);

  // Current slide index
  currentSlide = signal(0);

  // Auto-slide interval
  private autoSlideInterval?: ReturnType<typeof setInterval>;
  private readonly AUTO_SLIDE_DELAY = 5000; // 5 seconds

  ngOnInit() {
    this.startAutoSlide();
  }

  ngOnDestroy() {
    this.stopAutoSlide();
  }

  startAutoSlide() {
    this.autoSlideInterval = setInterval(() => {
      this.nextSlide();
    }, this.AUTO_SLIDE_DELAY);
  }

  stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  nextSlide() {
    const totalSlides = this.banners().length;
    this.currentSlide.update(current => (current + 1) % totalSlides);
  }

  previousSlide() {
    const totalSlides = this.banners().length;
    this.currentSlide.update(current => (current - 1 + totalSlides) % totalSlides);
  }

  goToSlide(index: number) {
    this.currentSlide.set(index);
    // Reset auto-slide timer when user manually navigates
    this.stopAutoSlide();
    this.startAutoSlide();
  }
}
