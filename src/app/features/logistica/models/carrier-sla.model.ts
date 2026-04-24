export interface CarrierSla {
    id: string;
    carrierId: string;
    serviceType: string;
    zone: string;
    maxDeliveryDays: number;
    weightLimitKg?: number;
    active: boolean;
    createdAt: string;
}

export interface CarrierPerformanceMetric {
    carrierId: string;
    period: string;
    totalDeliveries: number;
    onTime: number;
    late: number;
    failed: number;
    onTimeRate: number;
    avgDeliveryDays: number;
}

export interface CarrierDashboard {
    carrierId: string;
    carrierName: string;
    currentMetrics: CarrierPerformanceMetric;
    slas: CarrierSla[];
    trend: CarrierPerformanceMetric[];
}

export interface CarrierRecommendation {
    carrierId: string;
    carrierName: string;
    score: number;
    reasons: string[];
}

export interface CreateSlaBody {
    serviceType: string;
    zone: string;
    maxDeliveryDays: number;
    weightLimitKg?: number;
    active?: boolean;
}

export interface RecommendationParams {
    zone?: string;
    weightKg?: number;
    companyId?: string;
}
