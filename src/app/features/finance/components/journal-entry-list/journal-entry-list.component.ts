import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AccountingService } from '../../services/accounting.service';
import { JournalEntry, JournalEntryFilters, VoucherType, JournalEntryStatus } from '../../models/journal-entry.model';

@Component({
    selector: 'app-journal-entry-list',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="journal-entry-list">
            <div class="header">
                <h2>Asientos Contables</h2>
                <button class="btn btn-primary" routerLink="/finance/journal-entries/new">
                    <i class="icon-plus"></i> Nuevo Asiento
                </button>
            </div>

            <div class="filters">
                <div class="filter-group">
                    <label>Periodo:</label>
                    <input type="month" [(ngModel)]="periodo" (change)="onFilterChange()">
                </div>

                <div class="filter-group">
                    <label>Tipo:</label>
                    <select [(ngModel)]="tipoComprobante" (change)="onFilterChange()">
                        <option value="">Todos</option>
                        <option value="DIARIO">Diario</option>
                        <option value="INGRESO">Ingreso</option>
                        <option value="EGRESO">Egreso</option>
                        <option value="TRASPASO">Traspaso</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label>Estado:</label>
                    <select [(ngModel)]="estado" (change)="onFilterChange()">
                        <option value="">Todos</option>
                        <option value="BORRADOR">Borrador</option>
                        <option value="REGISTRADO">Registrado</option>
                        <option value="ANULADO">Anulado</option>
                    </select>
                </div>

                <button class="btn btn-secondary" (click)="clearFilters()">
                    Limpiar Filtros
                </button>
            </div>

            @if (accountingService.loading()) {
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Cargando asientos contables...</p>
                </div>
            }

            @if (accountingService.error()) {
                <div class="error-message">
                    <i class="icon-alert"></i>
                    {{ accountingService.error() }}
                </div>
            }

            @if (!accountingService.loading() && accountingService.journalEntries().length === 0) {
                <div class="empty-state">
                    <i class="icon-document"></i>
                    <p>No hay asientos contables registrados</p>
                </div>
            }

            @if (!accountingService.loading() && accountingService.journalEntries().length > 0) {
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Número</th>
                                <th>Tipo</th>
                                <th>Fecha</th>
                                <th>Periodo</th>
                                <th>Glosa</th>
                                <th class="text-right">Débito</th>
                                <th class="text-right">Crédito</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (entry of accountingService.journalEntries(); track entry.id) {
                                <tr>
                                    <td>{{ entry.numeroComprobante }}</td>
                                    <td>
                                        <span class="badge badge-{{ getVoucherTypeClass(entry.tipoComprobante) }}">
                                            {{ entry.tipoComprobante }}
                                        </span>
                                    </td>
                                    <td>{{ entry.fechaContable | date:'dd/MM/yyyy' }}</td>
                                    <td>{{ entry.periodo }}</td>
                                    <td class="glosa">{{ entry.glosa }}</td>
                                    <td class="text-right">{{ entry.totalDebito | currency:'S/ ' }}</td>
                                    <td class="text-right">{{ entry.totalCredito | currency:'S/ ' }}</td>
                                    <td>
                                        <span class="badge badge-{{ getStatusClass(entry.estado) }}">
                                            {{ entry.estado }}
                                        </span>
                                    </td>
                                    <td class="actions">
                                        <button 
                                            class="btn btn-sm btn-icon" 
                                            [routerLink]="['/finance/journal-entries', entry.id]"
                                            title="Ver detalle">
                                            <i class="icon-eye"></i>
                                        </button>
                                        @if (entry.estado === 'BORRADOR') {
                                            <button 
                                                class="btn btn-sm btn-icon btn-success" 
                                                (click)="registerEntry(entry.id)"
                                                title="Registrar">
                                                <i class="icon-check"></i>
                                            </button>
                                        }
                                        @if (entry.estado === 'REGISTRADO') {
                                            <button 
                                                class="btn btn-sm btn-icon btn-danger" 
                                                (click)="voidEntry(entry.id)"
                                                title="Anular">
                                                <i class="icon-x"></i>
                                            </button>
                                        }
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>

                <div class="summary">
                    <div class="summary-item">
                        <span class="label">Total Registrados:</span>
                        <span class="value">{{ accountingService.registeredEntries().length }}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Total Borradores:</span>
                        <span class="value">{{ accountingService.draftEntries().length }}</span>
                    </div>
                </div>
            }
        </div>
    `,
    styles: [`
        .journal-entry-list {
            padding: 24px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }

        .filters {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
            padding: 16px;
            background: #f5f5f5;
            border-radius: 8px;
        }

        .filter-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .filter-group label {
            font-size: 12px;
            font-weight: 600;
            color: #666;
        }

        .filter-group input,
        .filter-group select {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }

        .table-container {
            overflow-x: auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
        }

        .data-table th {
            background: #f8f9fa;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #dee2e6;
        }

        .data-table td {
            padding: 12px;
            border-bottom: 1px solid #dee2e6;
        }

        .data-table tr:hover {
            background: #f8f9fa;
        }

        .text-right {
            text-align: right;
        }

        .glosa {
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }

        .badge-DIARIO { background: #e3f2fd; color: #1976d2; }
        .badge-INGRESO { background: #e8f5e9; color: #388e3c; }
        .badge-EGRESO { background: #ffebee; color: #d32f2f; }
        .badge-TRASPASO { background: #fff3e0; color: #f57c00; }

        .badge-BORRADOR { background: #fff3e0; color: #f57c00; }
        .badge-REGISTRADO { background: #e8f5e9; color: #388e3c; }
        .badge-ANULADO { background: #ffebee; color: #d32f2f; }

        .actions {
            display: flex;
            gap: 8px;
        }

        .summary {
            display: flex;
            gap: 24px;
            margin-top: 16px;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .summary-item {
            display: flex;
            gap: 8px;
        }

        .summary-item .label {
            font-weight: 600;
            color: #666;
        }

        .summary-item .value {
            color: #1976d2;
            font-weight: 700;
        }

        .loading, .empty-state {
            text-align: center;
            padding: 48px;
            color: #666;
        }

        .error-message {
            padding: 16px;
            background: #ffebee;
            color: #d32f2f;
            border-radius: 8px;
            margin-bottom: 16px;
        }
    `]
})
export class JournalEntryListComponent implements OnInit {
    readonly accountingService = inject(AccountingService);

    periodo = signal('');
    tipoComprobante = signal('');
    estado = signal('');

    ngOnInit(): void {
        this.loadEntries();
    }

    async loadEntries(): Promise<void> {
        const filters: JournalEntryFilters = {};
        
        if (this.periodo()) filters.periodo = this.periodo();
        if (this.tipoComprobante()) filters.tipoComprobante = this.tipoComprobante() as VoucherType;
        if (this.estado()) filters.estado = this.estado() as JournalEntryStatus;

        await this.accountingService.loadJournalEntries(filters);
    }

    onFilterChange(): void {
        this.loadEntries();
    }

    clearFilters(): void {
        this.periodo.set('');
        this.tipoComprobante.set('');
        this.estado.set('');
        this.loadEntries();
    }

    async registerEntry(id: number): Promise<void> {
        if (confirm('¿Está seguro de registrar este asiento contable?')) {
            await this.accountingService.registerJournalEntry(id);
        }
    }

    async voidEntry(id: number): Promise<void> {
        if (confirm('¿Está seguro de anular este asiento contable?')) {
            await this.accountingService.voidJournalEntry(id);
        }
    }

    getVoucherTypeClass(type: string): string {
        return type;
    }

    getStatusClass(status: string): string {
        return status;
    }
}
