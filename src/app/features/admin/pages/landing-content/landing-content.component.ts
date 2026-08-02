import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LandingContentSections, LandingSectionKey } from '@core/models/landing-content.model';
import { RichTextEditorComponent } from '@shared/components';

@Component({
    selector: 'app-landing-content',
    standalone: true,
    imports: [FormsModule, RichTextEditorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './landing-content.component.html',
})
export class LandingContentComponent implements OnInit {
    private readonly http = inject(HttpClient);

    readonly problemPoints = signal<string[]>([]);
    readonly howItWorksSteps = signal<{ title: string; description: string }[]>([]);
    readonly trustPoints = signal<string[]>([]);
    readonly faqItems = signal<{ question: string; answer: string }[]>([]);

    readonly saving = signal<LandingSectionKey | null>(null);
    readonly successMsg = signal('');
    readonly errorMsg = signal('');

    ngOnInit(): void {
        this.http.get<Partial<LandingContentSections>>('/users/api/saas/landing-content').subscribe({
            next: (content) => {
                this.problemPoints.set(content.PROBLEM_POINTS ?? []);
                this.howItWorksSteps.set(content.HOW_IT_WORKS ?? []);
                this.trustPoints.set(content.TRUST_POINTS ?? []);
                this.faqItems.set(content.FAQ ?? []);
            },
            error: () => this.errorMsg.set('No se pudo cargar el contenido de la landing.'),
        });
    }

    addProblemPoint(): void {
        this.problemPoints.update((current) => [...current, '']);
    }

    removeProblemPoint(index: number): void {
        this.problemPoints.update((current) => current.filter((_, i) => i !== index));
    }

    addHowItWorksStep(): void {
        this.howItWorksSteps.update((current) => [...current, { title: '', description: '' }]);
    }

    removeHowItWorksStep(index: number): void {
        this.howItWorksSteps.update((current) => current.filter((_, i) => i !== index));
    }

    addTrustPoint(): void {
        this.trustPoints.update((current) => [...current, '']);
    }

    removeTrustPoint(index: number): void {
        this.trustPoints.update((current) => current.filter((_, i) => i !== index));
    }

    addFaqItem(): void {
        this.faqItems.update((current) => [...current, { question: '', answer: '' }]);
    }

    removeFaqItem(index: number): void {
        this.faqItems.update((current) => current.filter((_, i) => i !== index));
    }

    saveSection(sectionKey: LandingSectionKey): void {
        const contentBySection: Record<LandingSectionKey, unknown> = {
            PROBLEM_POINTS: this.problemPoints(),
            HOW_IT_WORKS: this.howItWorksSteps(),
            TRUST_POINTS: this.trustPoints(),
            FAQ: this.faqItems(),
        };

        this.saving.set(sectionKey);
        this.successMsg.set('');
        this.errorMsg.set('');

        this.http.put<void>('/users/api/saas/admin/landing-content', {
            sectionKey,
            content: contentBySection[sectionKey],
        }).subscribe({
            next: () => {
                this.saving.set(null);
                this.successMsg.set('Sección actualizada correctamente.');
            },
            error: () => {
                this.saving.set(null);
                this.errorMsg.set('Error al guardar la sección. Verifica que microshopusers esté activo.');
            },
        });
    }
}
