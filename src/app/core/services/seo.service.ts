import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface ProductSeoData {
    nombre: string;
    descripcion?: string;
    imagen?: string;
    precio: number;
    marca?: string;
    rating?: number;
    sku?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
    constructor(
        private title: Title,
        private meta: Meta,
        @Inject(DOCUMENT) private doc: Document,
    ) {}

    setProductPage(product: ProductSeoData): void {
        const desc = (product.descripcion ?? product.nombre).substring(0, 160);
        this.title.setTitle(`${product.nombre} | MicroShop`);
        this.meta.updateTag({ name: 'description', content: desc });
        this.meta.updateTag({ property: 'og:title', content: product.nombre });
        this.meta.updateTag({ property: 'og:description', content: desc });
        this.meta.updateTag({ property: 'og:type', content: 'product' });
        if (product.imagen) {
            this.meta.updateTag({ property: 'og:image', content: product.imagen });
        }
        this.setJsonLd(this.buildProductSchema(product));
    }

    setCategoryPage(categoryName: string, description?: string): void {
        this.title.setTitle(`${categoryName} | MicroShop`);
        this.meta.updateTag({
            name: 'description',
            content: description ?? `Compra ${categoryName} con los mejores precios y envío rápido`,
        });
        this.meta.updateTag({ property: 'og:title', content: `${categoryName} | MicroShop` });
        this.meta.updateTag({ property: 'og:type', content: 'website' });
        this.removeJsonLd();
    }

    setDefaultMeta(): void {
        this.title.setTitle('MicroShop — Tu tienda online en Perú');
        this.meta.updateTag({
            name: 'description',
            content: 'Compra online con los mejores precios y envío rápido a todo el Perú. Encuentra electrónica, moda, hogar y más.',
        });
        this.meta.updateTag({ property: 'og:title', content: 'MicroShop — Tu tienda online en Perú' });
        this.meta.updateTag({ property: 'og:type', content: 'website' });
        this.removeJsonLd();
    }

    private buildProductSchema(p: ProductSeoData): object {
        return {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: p.nombre,
            description: p.descripcion,
            sku: p.sku,
            brand: p.marca ? { '@type': 'Brand', name: p.marca } : undefined,
            image: p.imagen,
            offers: {
                '@type': 'Offer',
                priceCurrency: 'PEN',
                price: p.precio,
                availability: 'https://schema.org/InStock',
                seller: { '@type': 'Organization', name: 'MicroShop' },
            },
            aggregateRating: p.rating
                ? { '@type': 'AggregateRating', ratingValue: p.rating, bestRating: 5, worstRating: 1 }
                : undefined,
        };
    }

    private setJsonLd(schema: object): void {
        let el = this.doc.getElementById('json-ld-product') as HTMLScriptElement | null;
        if (!el) {
            el = this.doc.createElement('script') as HTMLScriptElement;
            el.id = 'json-ld-product';
            el.type = 'application/ld+json';
            this.doc.head.appendChild(el);
        }
        el.textContent = JSON.stringify(schema, (_, v) => v ?? undefined);
    }

    private removeJsonLd(): void {
        this.doc.getElementById('json-ld-product')?.remove();
    }
}
