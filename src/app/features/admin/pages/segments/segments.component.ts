import {
    Component, OnInit, inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { SegmentService } from '@features/admin/services/segment.service';
import { PaginationComponent, PaginationChangeEvent } from '@shared/ui/pagination/pagination.component';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import {
    SegmentResponse,
    SegmentRequest,
    TIPO_CLIENTE_OPTIONS,
    SEGMENT_COLOR_OPTIONS
} from '@features/admin/models/segment.model';

@Component({
    selector: 'app-segments',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, PaginationComponent, DrawerComponent],
    templateUrl: './segments.component.html',
    styleUrl: './segments.component.scss'
})
export class SegmentsComponent implements OnInit {
    private readonly segmentService = inject(SegmentService);
    private readonly fb = inject(FormBuilder);

    // Datos
    segments = signal<SegmentResponse[]>([]);
    selectedSegment = signal<SegmentResponse | null>(null);

    // UI
    loading    = signal(false);
    error      = signal<string | null>(null);
    showDrawer = signal(false);
    editMode   = signal(false);
    submitting = signal(false);
    submitError = signal<string | null>(null);

    // Filtros
    searchQuery = signal('');

    // Paginación
    currentPage   = signal(0);
    pageSize      = signal(10);
    totalElements = signal(0);
    totalPages    = signal(0);

    // Computed
    hasSegments = computed(() => this.segments().length > 0);
    isEmpty     = computed(() => !this.loading() && !this.hasSegments());

    // Opciones
    tipoClienteOptions  = TIPO_CLIENTE_OPTIONS;
    colorOptions        = SEGMENT_COLOR_OPTIONS;

    segmentForm: FormGroup;

    constructor() {
        this.segmentForm = this.fb.group({
            nombre:      ['', [Validators.required, Validators.maxLength(100)]],
            descripcion: ['', [Validators.maxLength(300)]],
            color:       ['#d7132a', [Validators.required]],
            tipoCliente: ['REGULAR', [Validators.required]],
            activo:      [true]
        });
    }

    ngOnInit(): void {
        this.loadSegments();
    }

    loadSegments(): void {
        this.loading.set(true);
        this.error.set(null);

        this.segmentService.getAll(
            this.currentPage(),
            this.pageSize(),
            this.searchQuery() || undefined
        ).subscribe({
            next: (res) => {
                this.segments.set(res.content);
                this.totalElements.set(res.page.totalElements);
                this.totalPages.set(res.page.totalPages);
                this.loading.set(false);
            },
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    onSearch(query: string): void {
        this.searchQuery.set(query);
        this.currentPage.set(0);
        this.loadSegments();
    }

    onPaginationChange(event: PaginationChangeEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
        this.loadSegments();
    }

    openCreate(): void {
        this.editMode.set(false);
        this.selectedSegment.set(null);
        this.segmentForm.reset({ color: '#d7132a', tipoCliente: 'REGULAR', activo: true });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    openEdit(segment: SegmentResponse): void {
        this.editMode.set(true);
        this.selectedSegment.set(segment);
        this.segmentForm.patchValue({
            nombre:      segment.nombre,
            descripcion: segment.descripcion,
            color:       segment.color,
            tipoCliente: segment.tipoCliente,
            activo:      segment.activo
        });
        this.submitError.set(null);
        this.showDrawer.set(true);
    }

    closeDrawer(): void {
        this.showDrawer.set(false);
        this.segmentForm.reset();
    }

    onSubmit(): void {
        if (this.segmentForm.invalid) {
            this.segmentForm.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.submitError.set(null);

        const request: SegmentRequest = this.segmentForm.value as SegmentRequest;
        const op = this.editMode()
            ? this.segmentService.update(this.selectedSegment()!.id, request)
            : this.segmentService.create(request);

        op.subscribe({
            next: () => {
                this.submitting.set(false);
                this.closeDrawer();
                this.loadSegments();
            },
            error: (err: Error) => {
                this.submitError.set(err.message);
                this.submitting.set(false);
            }
        });
    }

    onDelete(segment: SegmentResponse): void {
        if (!confirm(`¿Eliminar el segmento "${segment.nombre}"?`)) return;
        this.loading.set(true);
        this.segmentService.delete(segment.id).subscribe({
            next: () => this.loadSegments(),
            error: (err: Error) => {
                this.error.set(err.message);
                this.loading.set(false);
            }
        });
    }

    hasError(controlName: string): boolean {
        const control = this.segmentForm.get(controlName);
        return !!(control && control.invalid && control.touched);
    }

    getErrorMessage(controlName: string): string {
        const control = this.segmentForm.get(controlName);
        if (!control || !control.errors || !control.touched) return '';
        if (control.errors['required'])  return 'Este campo es obligatorio';
        if (control.errors['maxlength']) return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
        return 'Campo inválido';
    }
}
