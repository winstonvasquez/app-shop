export type ReportType = 'SHIPMENTS' | 'CARRIERS' | 'RETURNS' | 'KARDEX' | 'PICKING' | 'KPI';
export type ReportStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface LogisticsReport {
    id: string;
    type: ReportType;
    companyId: string;
    status: ReportStatus;
    fileName?: string;
    createdAt: string;
    readyAt?: string;
}

export interface LogisticsReportPage {
    content: LogisticsReport[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export interface GenerateReportBody {
    type: ReportType;
    companyId: string;
    from?: string;
    to?: string;
    filters?: Record<string, string>;
}
