import { Component, input, signal } from '@angular/core';
import { NgClass, NgOptimizedImage } from '@angular/common';
import { Image } from '@features/products/models/image.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-product-image-gallery',
  standalone: true,
  imports: [NgClass, NgOptimizedImage, TranslateModule],
  templateUrl: './product-image-gallery.component.html'
})
export class ProductImageGalleryComponent {
  images = input.required<Image[]>();
  selectedImageIndex = signal<number>(0);

  get selectedImage(): () => Image | undefined {
    return () => this.images()[this.selectedImageIndex()];
  }

  selectImage(index: number) {
    this.selectedImageIndex.set(index);
  }
}
