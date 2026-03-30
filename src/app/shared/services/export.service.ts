import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExportService {
    exportCsv(filas: string[][], nombreArchivo: string): void {
        const contenido = filas
            .map(fila => fila.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        this.descargar(contenido, nombreArchivo + '.csv', 'text/csv;charset=utf-8;');
    }

    exportExcel(cabecera: string[], filas: string[][], nombreArchivo: string): void {
        const thead = `<thead><tr>${cabecera.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
        const tbody = `<tbody>${filas
            .map(f => `<tr>${f.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`)
            .join('')}</tbody>`;
        const html = `<html><head><meta charset="UTF-8"></head><body><table>${thead}${tbody}</table></body></html>`;
        this.descargar(html, nombreArchivo + '.xls', 'application/vnd.ms-excel');
    }

    descargarTxt(contenido: string, nombreArchivo: string): void {
        this.descargar(contenido, nombreArchivo + '.txt', 'text/plain;charset=utf-8;');
    }

    private descargar(contenido: string, nombre: string, tipo: string): void {
        const blob = new Blob([contenido], { type: tipo });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        a.click();
        URL.revokeObjectURL(url);
    }
}
