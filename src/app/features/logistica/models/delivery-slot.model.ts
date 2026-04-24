export interface DeliverySlot {
    id: string;
    date: string;
    zone: string;
    startTime: string;
    endTime: string;
    capacity: number;
    available: number;
    companyId: string;
}

export interface DeliverySlotBooking {
    id: string;
    slotId: string;
    orderId: string;
    companyId: string;
    status: 'BOOKED' | 'CANCELLED';
    bookedAt: string;
    cancelledAt?: string;
}

export interface GenerateWeekBody {
    weekStartDate: string;
    zones: string[];
    companyId: string;
    slotsPerDay?: number;
    capacityPerSlot?: number;
}

export interface BookSlotBody {
    slotId: string;
    orderId: string;
    companyId: string;
}
