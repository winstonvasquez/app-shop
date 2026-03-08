import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlmacenService } from '../../../services/almacen.service';
import { Almacen, CreateAlmacenDto } from '../../../models/almacen.model';

@Component({
  selector: 'app-almacenes-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Almacenes</h1>
        <p class="page-subtitle">{{ almacenes().length }} almacenes registrados</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" (click)="showModal.set(true)">
          + Nuevo Almacén
        </button>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Dirección</th>
            <th>Teléfono</th>
            <th>Items</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (almacen of almacenes(); track almacen.id) {
            <tr>
              <td class="font-mono">{{ almacen.codigo }}</td>
              <td>{{ almacen.nombre }}</td>
              <td class="text-muted">{{ almacen.direccion || '-' }}</td>
              <td>{{ almacen.telefono || '-' }}</td>
              <td class="text-right">{{ almacen.totalItems || 0 }}</td>
              <td>
                <span class="badge badge-success">{{ almacen.estado }}</span>
              </td>
              <td>
                <button class="btn btn-secondary btn-sm">Editar</button>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7" class="text-center text-muted">
                No hay almacenes. Crea el primero.
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (showModal()) {
      <div class="modal-overlay" (click)="showModal.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Nuevo Almacén</h3>
            <button class="close-btn" (click)="showModal.set(false)">×</button>
          </div>
          <div class="modal-body">
            <form [formGroup]="almacenForm">
              <div class="form-group">
                <label class="form-label">Código *</label>
                <input class="form-control" formControlName="codigo" placeholder="ALM1">
              </div>
              <div class="form-group">
                <label class="form-label">Nombre *</label>
                <input class="form-control" formControlName="nombre" placeholder="Almacén Principal">
              </div>
              <div class="form-group">
                <label class="form-label">Dirección</label>
                <input class="form-control" formControlName="direccion">
              </div>
              <div class="form-group">
                <label class="form-label">Teléfono</label>
                <input class="form-control" formControlName="telefono">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showModal.set(false)">Cancelar</button>
            <button class="btn btn-primary" (click)="createAlmacen()">Crear</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: white;
      border-radius: 12px;
      width: 480px;
      max-width: 90vw;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border);
    }
    .modal-header h3 { margin: 0; }
    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
    }
    .modal-body { padding: 20px; }
    .modal-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--color-border);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .form-group { margin-bottom: 16px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlmacenesPageComponent implements OnInit {
  private readonly almacenService = inject(AlmacenService);
  private readonly fb = inject(FormBuilder);
  
  readonly almacenes = signal<Almacen[]>([]);
  readonly showModal = signal(false);
  readonly companyId = 'demo-company';
  readonly trackByAlmacenId = (index: number, almacen: Almacen) => almacen.id;

  almacenForm: FormGroup = this.fb.group({
    codigo: ['', Validators.required],
    nombre: ['', Validators.required],
    direccion: [''],
    telefono: ['']
  });

  ngOnInit() {
    this.loadAlmacenes();
  }

  loadAlmacenes() {
    this.almacenService.getAlmacenes(this.companyId).subscribe({
      next: (res) => this.almacenes.set(res.content),
      error: () => this.almacenes.set([])
    });
  }

  createAlmacen() {
    if (this.almacenForm.invalid) return;
    
    this.almacenService.createAlmacen(this.almacenForm.value, this.companyId).subscribe({
      next: () => {
        this.showModal.set(false);
        this.almacenForm.reset();
        this.loadAlmacenes();
      }
    });
  }
}
