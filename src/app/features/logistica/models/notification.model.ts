export interface LogisticsNotification {
    id: string;
    userId: string;
    companyId: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
    readAt?: string;
}

export interface UnreadCountResponse {
    count: number;
}
