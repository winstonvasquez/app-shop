import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

export interface ReporteXZ {
    tipo: string;
    turnoId: number;
    cajeroId: number;
    cajeroNombre: string;
    fechaApertura: string;
    fechaCierre: string | null;
    montoApertura: number;
    totalVentas: number;
    totalEfectivo: number;
    totalTarjeta: number;
    totalYape: number;
    totalPlin: number;
    totalAnulaciones: number;
    totalDevoluciones: number;
    totalIngresosEfectivo: number;
    totalRetirosEfectivo: number;
    montoEsperadoEnCaja: number;
    montoCierreContado: number | null;
    diferenciaArqueo: number | null;
    totalTransacciones: number;
    boletasEmitidas: number;
    facturasEmitidas: number;
}

@Component({
    selector: 'app-pos-report-viewer',
    standalone: true,
    templateUrl: './pos-report-viewer.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosReportViewerComponent {

    readonly reporte = input<ReporteXZ | null>(null);
    readonly close = output<void>();

    fmt(val: number | null | undefined): string {
        return (val ?? 0).toFixed(2);
    }

    formatDate(iso: string): string {
        return new Date(iso).toLocaleString('es-PE', {
            dateStyle: 'short',
            timeStyle: 'short',
        });
    }

    printReport(): void {
        window.print();
    }
}
