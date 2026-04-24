import {
    Component, ChangeDetectionStrategy, output, signal,
    ElementRef, ViewChild, AfterViewInit, OnDestroy,
} from '@angular/core';

@Component({
    selector: 'app-pos-camera-scanner',
    standalone: true,
    templateUrl: './pos-camera-scanner.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosCameraScannerComponent implements AfterViewInit, OnDestroy {

    readonly scanned = output<string>();
    readonly close = output<void>();

    @ViewChild('videoEl') videoRef?: ElementRef<HTMLVideoElement>;

    readonly error = signal('');
    readonly lastScanned = signal('');
    private stream: MediaStream | null = null;
    private scanInterval?: ReturnType<typeof setInterval>;

    async ngAfterViewInit(): Promise<void> {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });
            if (this.videoRef) {
                this.videoRef.nativeElement.srcObject = this.stream;
            }
            this.startBarcodeDetection();
        } catch {
            this.error.set('No se pudo acceder a la cámara');
        }
    }

    ngOnDestroy(): void {
        this.stopStream();
    }

    private startBarcodeDetection(): void {
        // Use BarcodeDetector API if available
        if ('BarcodeDetector' in window) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const BarcodeDetectorClass = (window as Record<string, unknown>)['BarcodeDetector'] as new () => {
                detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
            };
            const detector = new BarcodeDetectorClass();
            this.scanInterval = setInterval(async () => {
                if (!this.videoRef) return;
                try {
                    const barcodes = await detector.detect(this.videoRef.nativeElement);
                    if (barcodes.length > 0) {
                        const code = barcodes[0].rawValue;
                        this.lastScanned.set(code);
                        this.scanned.emit(code);
                        this.stopStream();
                    }
                } catch { /* ignore detection errors */ }
            }, 500);
        } else {
            this.error.set('BarcodeDetector no soportado en este navegador');
        }
    }

    private stopStream(): void {
        clearInterval(this.scanInterval);
        this.stream?.getTracks().forEach(t => t.stop());
        this.stream = null;
    }
}
