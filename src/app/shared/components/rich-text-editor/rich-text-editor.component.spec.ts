import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { beforeEach, describe, expect, it } from 'vitest';
import { RichTextEditorComponent } from './rich-text-editor.component';

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, RichTextEditorComponent],
    template: `
        <form [formGroup]="form">
            <app-rich-text-editor formControlName="descripcion" [rows]="3" placeholder="Descripción…" />
        </form>
    `,
})
class HostComponent {
    readonly form = new FormGroup({
        descripcion: new FormControl<string>('<p>Hola <b>mundo</b></p>', { nonNullable: true, validators: [Validators.required] }),
    });
}

describe('RichTextEditorComponent', () => {
    let fixture: ComponentFixture<HostComponent>;

    const area = (): HTMLElement =>
        fixture.nativeElement.querySelector('.rte__area') as HTMLElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
    });

    /**
     * Regresión: `FormControlName.ngOnChanges` llama `writeValue` en el update pass del
     * PADRE, antes de que exista la vista del hijo. Leer ahí un `viewChild.required`
     * lanzaba NG0951 y mataba todo formulario que montara el editor.
     */
    it('monta dentro de un formulario reactivo sin lanzar', () => {
        expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('pinta el valor inicial del control tras el primer render', () => {
        fixture.detectChanges();
        expect(area().innerHTML).toContain('mundo');
        expect(area().querySelector('b')).not.toBeNull();
    });

    it('propaga la edición del usuario al control', () => {
        fixture.detectChanges();
        area().innerHTML = '<p>nuevo texto</p>';
        area().dispatchEvent(new Event('input'));
        expect(fixture.componentInstance.form.controls.descripcion.value).toContain('nuevo texto');
    });

    it('normaliza el vacío a "" para que Validators.required siga funcionando', () => {
        fixture.detectChanges();
        // Chrome deja un `<br>` residual al borrar todo: no debe contar como contenido.
        area().innerHTML = '<br>';
        area().dispatchEvent(new Event('input'));
        const control = fixture.componentInstance.form.controls.descripcion;
        expect(control.value).toBe('');
        expect(control.hasError('required')).toBe(true);
    });

    it('poda las etiquetas y atributos fuera de la whitelist', () => {
        fixture.detectChanges();
        area().innerHTML = '<script>alert(1)</script><span style="color:red" onclick="x()">texto</span>';
        area().dispatchEvent(new Event('input'));
        const value = fixture.componentInstance.form.controls.descripcion.value;
        expect(value).not.toContain('script');
        expect(value).not.toContain('onclick');
        expect(value).not.toContain('style');
        expect(value).toContain('texto');
    });

    it('no marca el control como dirty al enfocar y salir sin escribir', () => {
        fixture.detectChanges();
        area().dispatchEvent(new Event('blur'));
        const control = fixture.componentInstance.form.controls.descripcion;
        expect(control.touched).toBe(true);
        expect(control.dirty).toBe(false);
    });

    it('poda atributos que no son style/class/id (dir, align, data-*)', () => {
        fixture.detectChanges();
        area().innerHTML = '<p dir="rtl" data-x="1">texto</p>';
        area().dispatchEvent(new Event('blur'));
        const value = fixture.componentInstance.form.controls.descripcion.value;
        expect(value).not.toContain('dir=');
        expect(value).not.toContain('data-x');
        expect(value).toContain('texto');
    });

    it('deshabilita el área editable cuando el control se deshabilita', () => {
        fixture.detectChanges();
        fixture.componentInstance.form.controls.descripcion.disable();
        fixture.detectChanges();
        expect(area().getAttribute('contenteditable')).toBe('false');
    });
});
