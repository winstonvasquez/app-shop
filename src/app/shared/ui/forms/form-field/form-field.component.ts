import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
    selector: 'app-form-field',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './form-field.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormFieldComponent {
    label = input.required<string>();
    control = input.required<FormControl>();
    type = input<string>('text');
    placeholder = input<string>('');
    hint = input<string>('');
    required = input<boolean>(false);
    disabled = input<boolean>(false);
    
    id = computed(() => `field-${Math.random().toString(36).substr(2, 9)}`);
    
    hasError = computed(() => {
        const ctrl = this.control();
        return ctrl.invalid && (ctrl.dirty || ctrl.touched);
    });
    
    errorMessage = computed(() => {
        const ctrl = this.control();
        if (!this.hasError()) return '';
        
        const errors = ctrl.errors;
        if (!errors) return '';
        
        if (errors['required']) return 'Este campo es requerido';
        if (errors['email']) return 'Email inválido';
        if (errors['minlength']) {
            return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
        }
        if (errors['maxlength']) {
            return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
        }
        if (errors['min']) return `Valor mínimo: ${errors['min'].min}`;
        if (errors['max']) return `Valor máximo: ${errors['max'].max}`;
        if (errors['pattern']) return 'Formato inválido';
        
        return 'Campo inválido';
    });
}
