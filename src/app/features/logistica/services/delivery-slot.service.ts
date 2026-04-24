import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
    DeliverySlot,
    DeliverySlotBooking,
    GenerateWeekBody,
    BookSlotBody
} from '../models/delivery-slot.model';

@Injectable({ providedIn: 'root' })
export class DeliverySlotService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrls.logistics}/api/delivery-slots`;

    getAvailable(date: string, zone: string): Observable<DeliverySlot[]> {
        const params = new HttpParams()
            .set('date', date)
            .set('zone', zone);
        return this.http.get<DeliverySlot[]>(`${this.baseUrl}/available`, { params });
    }

    generateWeek(body: GenerateWeekBody): Observable<DeliverySlot[]> {
        return this.http.post<DeliverySlot[]>(`${this.baseUrl}/generate-week`, body);
    }

    book(body: BookSlotBody): Observable<DeliverySlotBooking> {
        return this.http.post<DeliverySlotBooking>(`${this.baseUrl}/bookings`, body);
    }

    cancelBooking(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/bookings/${id}`);
    }

    getBookingByOrder(orderId: string): Observable<DeliverySlotBooking> {
        return this.http.get<DeliverySlotBooking>(`${this.baseUrl}/bookings/by-order/${orderId}`);
    }
}
