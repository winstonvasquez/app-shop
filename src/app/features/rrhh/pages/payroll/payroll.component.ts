import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PayrollService } from '../../services/payroll.service';

@Component({
    selector: 'app-payroll',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule
    ],
    templateUrl: './payroll.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayrollComponent implements OnInit {
    private readonly payrollService = inject(PayrollService);
    private readonly fb = inject(FormBuilder);

    readonly loading = this.payrollService.loading;
    readonly payrolls = this.payrollService.payrolls;
    readonly message = signal<string | null>(null);
    readonly trackByPayrollId = (index: number, payroll: any) => payroll.id;

    payrollForm: FormGroup = this.fb.group({
        periodo: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}$/)]]
    });

    ngOnInit(): void {
        const today = new Date();
        const periodo = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        this.payrollForm.patchValue({ periodo });
    }

    async onGeneratePayroll(): Promise<void> {
        if (this.payrollForm.invalid) return;

        try {
            const periodo = this.payrollForm.value.periodo;
            await this.payrollService.generatePayrollForPeriod(periodo);

            this.message.set(`Planillas generadas para ${periodo}`);
            setTimeout(() => this.message.set(null), 3000);
        } catch (error) {
            this.message.set('Error al generar planillas');
            setTimeout(() => this.message.set(null), 3000);
            console.error('Error al generar planillas', error);
        }
    }
}
