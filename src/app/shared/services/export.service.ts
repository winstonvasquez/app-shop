import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx-js-style';
import { CellStyle, estilosDeReporte, hojaDeReporte, humanizarNombreDeArchivo } from './hoja-de-reporte.util';

@Injectable({ providedIn: 'root' })
export class ExportService {
    exportCsv(filas: string[][], nombreArchivo: string): void {
        const contenido = filas
            .map(fila => fila.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        this.descargar(contenido, nombreArchivo + '.csv', 'text/csv;charset=utf-8;');
    }

    /**
     * Exporta un reporte XLSX real y formateado:
     *  - Banda de título con color corporativo + texto blanco
     *  - Metadatos de encabezado (generado, total de registros)
     *  - Fila de cabecera con color + bordes
     *  - Anchos de columna automáticos
     */
    exportExcel(cabecera: string[], filas: string[][], nombreArchivo: string, titulo?: string): void {
        const nCols = Math.max(cabecera.length, 1);
        const { aoa, anchos } = hojaDeReporte(
            cabecera, filas,
            titulo || humanizarNombreDeArchivo(nombreArchivo),
            new Date().toLocaleString('es-PE'),
        );

        const ws = XLSX.utils.aoa_to_sheet(aoa);

        // Título y metadata a todo el ancho
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: nCols - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: nCols - 1 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: nCols - 1 } },
        ];

        const set = (r: number, c: number, style: CellStyle): void => {
            const ref = XLSX.utils.encode_cell({ r, c });
            const cell = (ws[ref] as Record<string, unknown>) ?? (ws[ref] = { t: 's', v: '' } as Record<string, unknown>);
            cell['s'] = style;
        };

        for (const [r, c, style] of estilosDeReporte(nCols, aoa.length)) set(r, c, style);

        ws['!cols'] = anchos;
        ws['!rows'] = [{ hpt: 26 }, { hpt: 15 }, { hpt: 15 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        this.descargarBlob(blob, `${nombreArchivo}.xlsx`);
    }

    descargarTxt(contenido: string, nombreArchivo: string): void {
        this.descargar(contenido, nombreArchivo + '.txt', 'text/plain;charset=utf-8;');
    }

    private descargar(contenido: string, nombre: string, tipo: string): void {
        this.descargarBlob(new Blob([contenido], { type: tipo }), nombre);
    }

    private descargarBlob(blob: Blob, nombre: string): void {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        a.click();
        URL.revokeObjectURL(url);
    }
}
