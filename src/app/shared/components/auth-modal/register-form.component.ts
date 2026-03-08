import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface RegisterData {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
}

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-form.component.html',
  styleUrl: './register-form.component.scss'
})
export class RegisterFormComponent {
  @Input() email = '';
  @Output() register = new EventEmitter<RegisterData>();
  @Output() back = new EventEmitter<void>();

  nombres = '';
  apellidos = '';
  tipoDocumento = 'DNI';
  numeroDocumento = '';
  fechaNacimiento = '';
  loading = signal(false);
  errorMsg = signal('');

  documentTypes = ['DNI', 'CE', 'PASAPORTE'];

  isValid(): boolean {
    return !!(
      this.nombres.trim() &&
      this.apellidos.trim() &&
      this.tipoDocumento &&
      this.numeroDocumento.trim() &&
      this.fechaNacimiento
    );
  }

  onSubmit() {
    if (!this.isValid()) {
      this.errorMsg.set('Por favor completa todos los campos.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    this.register.emit({
      nombres: this.nombres.trim(),
      apellidos: this.apellidos.trim(),
      tipoDocumento: this.tipoDocumento,
      numeroDocumento: this.numeroDocumento.trim(),
      fechaNacimiento: this.fechaNacimiento
    });
  }

  goBack() {
    this.back.emit();
  }
}
