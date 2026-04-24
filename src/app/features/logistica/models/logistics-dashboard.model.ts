export interface CarrierKpi {
    carrierId: string;
    carrierName: string;
    deliveredCount: number;
    avgDeliveryDays: number;
    onTimeRate: number;
    returnRate: number;
}

export interface LogisticsKpi {
    companyId: string;
    from: string;
    to: string;
    totalShipments: number;
    deliveredShipments: number;
    pendingShipments: number;
    returnedShipments: number;
    fulfillmentRate: number;
    avgDeliveryTimeDays: number;
    returnRate: number;
    byCarrier: CarrierKpi[];
}
