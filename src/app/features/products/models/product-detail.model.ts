import { Attribute } from './attribute.model';
import { Image } from './image.model';
import { Review } from './review.model';
import { Seller } from './seller.model';
import { Variant } from './variant.model';

export interface ProductDetail {
    id: number;
    nombre: string;
    descripcion: string;
    precioBase: number;
    originalPrice: number;
    discount: string;
    badge: string;
    salesCount: string;
    rating: number;
    savingsExtra: string;
    timerEndTime: string;
    features: string;
    starSeller: boolean;
    deliveryTimeframe?: string;
    carriers?: string;
    sizingFitPercentage?: number;
    topBannerText?: string;
    categoryRankText?: string;
    returnPolicyText?: string;
    seller: Seller;
    images: Image[];
    variants: Variant[];
    latestReviews: Review[];
    attributes: Attribute[];
}
