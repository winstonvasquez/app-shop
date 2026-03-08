# Componentes UI Reutilizables

Biblioteca de componentes UI reutilizables para el proyecto app-shop Angular 21.

---

## 📦 Componentes Disponibles

### 1. DataTableComponent

Tabla de datos con paginación, ordenamiento y acciones.

**Ubicación:** `shared/ui/tables/data-table/`

**Uso:**
```typescript
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';

// En el componente
columns: TableColumn<Product>[] = [
  { key: 'id', label: 'ID', sortable: true, width: '80px' },
  { key: 'nombre', label: 'Nombre', sortable: true },
  { key: 'precio', label: 'Precio', align: 'right', render: (row) => `$${row.precio}` }
];

actions: TableAction<Product>[] = [
  { label: 'Editar', icon: '✏️', onClick: (row) => this.edit(row) },
  { label: 'Eliminar', icon: '🗑️', onClick: (row) => this.delete(row), class: 'danger' }
];

// En el template
<app-data-table
  [data]="products()"
  [columns]="columns"
  [actions]="actions"
  [loading]="loading()"
  [currentPage]="currentPage()"
  [pageSize]="pageSize()"
  [totalElements]="totalElements()"
  [totalPages]="totalPages()"
  (pageChange)="onPageChange($event)"
  (sortChange)="onSort($event)"
/>
```

**Características:**
- ✅ Paginación automática
- ✅ Ordenamiento por columnas
- ✅ Acciones por fila
- ✅ Selección de filas
- ✅ Estado de carga
- ✅ Estado vacío
- ✅ Responsive

---

### 2. FormFieldComponent

Campo de formulario con validación y mensajes de error.

**Ubicación:** `shared/ui/forms/form-field/`

**Uso:**
```typescript
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { FormBuilder, Validators } from '@angular/forms';

// En el componente
form = this.fb.group({
  nombre: ['', [Validators.required, Validators.minLength(3)]],
  email: ['', [Validators.required, Validators.email]],
  precio: [0, [Validators.required, Validators.min(0)]]
});

// En el template
<app-form-field
  label="Nombre del producto"
  [control]="form.controls.nombre"
  type="text"
  placeholder="Ingrese el nombre"
  hint="Mínimo 3 caracteres"
  [required]="true"
/>

<app-form-field
  label="Email"
  [control]="form.controls.email"
  type="email"
  placeholder="ejemplo@correo.com"
  [required]="true"
/>

<app-form-field
  label="Precio"
  [control]="form.controls.precio"
  type="number"
  placeholder="0.00"
  [required]="true"
/>
```

**Características:**
- ✅ Validación automática
- ✅ Mensajes de error personalizados
- ✅ Hint text
- ✅ Indicador de campo requerido
- ✅ Estados disabled
- ✅ Soporte para FormControl

---

### 3. ModalComponent

Modal/Dialog reutilizable con backdrop y animaciones.

**Ubicación:** `shared/ui/modals/modal/`

**Uso:**
```typescript
import { ModalComponent } from '@shared/ui/modals/modal/modal.component';

// En el componente
showModal = signal(false);

openModal() {
  this.showModal.set(true);
}

closeModal() {
  this.showModal.set(false);
}

// En el template
<app-modal
  [isOpen]="showModal()"
  title="Crear Producto"
  size="md"
  [closeOnBackdrop]="true"
  (close)="closeModal()">
  
  <div body>
    <!-- Contenido del modal -->
    <p>Contenido aquí...</p>
  </div>
  
  <div footer>
    <button (click)="closeModal()">Cancelar</button>
    <button (click)="save()">Guardar</button>
  </div>
</app-modal>
```

**Tamaños disponibles:**
- `sm` - 400px
- `md` - 600px (default)
- `lg` - 800px
- `xl` - 1200px
- `full` - 95vw

**Características:**
- ✅ Backdrop con click para cerrar
- ✅ Escape para cerrar
- ✅ Múltiples tamaños
- ✅ Animaciones suaves
- ✅ Slots para header, body, footer
- ✅ Responsive

---

### 4. PageHeaderComponent

Encabezado de página con breadcrumbs y acciones.

**Ubicación:** `shared/ui/layout/page-header/`

**Uso:**
```typescript
import { PageHeaderComponent, Breadcrumb } from '@shared/ui/layout/page-header/page-header.component';

// En el componente
breadcrumbs: Breadcrumb[] = [
  { label: 'Admin', url: '/admin' },
  { label: 'Productos', url: '/admin/products' },
  { label: 'Nuevo' }
];

// En el template
<app-page-header
  title="Productos"
  subtitle="Gestión de productos del catálogo"
  [breadcrumbs]="breadcrumbs"
  [showBackButton]="false">
  
  <div actions>
    <button class="btn-primary">Nuevo Producto</button>
    <button class="btn-secondary">Exportar</button>
  </div>
</app-page-header>
```

**Características:**
- ✅ Breadcrumbs navegables
- ✅ Título y subtítulo
- ✅ Botón de volver
- ✅ Slot para acciones
- ✅ Responsive

---

## 🎨 Estilos

Todos los componentes usan:
- Variables CSS para temas
- Clases de TailwindCSS cuando es apropiado
- Estilos encapsulados (scoped)
- Animaciones suaves
- Diseño responsive

---

## 📋 Convenciones

### Naming
- Componentes: PascalCase (ej: `DataTableComponent`)
- Archivos: kebab-case (ej: `data-table.component.ts`)
- Inputs: camelCase (ej: `isOpen`, `pageSize`)
- Outputs: camelCase (ej: `pageChange`, `sortChange`)

### Signals
Todos los componentes usan Angular Signals para:
- Inputs: `input()`, `input.required()`
- Outputs: `output()`
- Estado interno: `signal()`, `computed()`

### Change Detection
Todos los componentes usan `ChangeDetectionStrategy.OnPush` para mejor performance.

---

## 🚀 Próximos Componentes

### En desarrollo
- LoadingSpinnerComponent
- AlertComponent
- ConfirmDialogComponent
- SelectComponent
- DatePickerComponent

### Planificados
- BadgeComponent
- ChipComponent
- ToastComponent
- SkeletonComponent
- CardComponent

---

## 📖 Ejemplos de Uso

### Ejemplo completo: Lista de productos

```typescript
import { Component, signal, inject } from '@angular/core';
import { DataTableComponent, TableColumn, TableAction } from '@shared/ui/tables/data-table/data-table.component';
import { PageHeaderComponent } from '@shared/ui/layout/page-header/page-header.component';
import { ModalComponent } from '@shared/ui/modals/modal/modal.component';
import { FormFieldComponent } from '@shared/ui/forms/form-field/form-field.component';
import { ProductService } from '@core/services/product.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    DataTableComponent,
    PageHeaderComponent,
    ModalComponent,
    FormFieldComponent
  ],
  template: `
    <app-page-header
      title="Productos"
      subtitle="Gestión del catálogo de productos">
      <div actions>
        <button (click)="openCreateModal()">Nuevo Producto</button>
      </div>
    </app-page-header>

    <app-data-table
      [data]="products()"
      [columns]="columns"
      [actions]="actions"
      [loading]="loading()"
      [currentPage]="currentPage()"
      [pageSize]="pageSize()"
      [totalElements]="totalElements()"
      [totalPages]="totalPages()"
      (pageChange)="onPageChange($event)"
      (sortChange)="onSort($event)"
    />

    <app-modal
      [isOpen]="showModal()"
      title="Crear Producto"
      (close)="closeModal()">
      <div body>
        <app-form-field
          label="Nombre"
          [control]="form.controls.nombre"
          [required]="true"
        />
      </div>
      <div footer>
        <button (click)="closeModal()">Cancelar</button>
        <button (click)="save()">Guardar</button>
      </div>
    </app-modal>
  `
})
export class ProductsComponent {
  private productService = inject(ProductService);
  
  products = signal([]);
  loading = signal(false);
  showModal = signal(false);
  
  columns: TableColumn[] = [
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'precio', label: 'Precio', sortable: true, align: 'right' }
  ];
  
  actions: TableAction[] = [
    { label: 'Editar', onClick: (row) => this.edit(row) },
    { label: 'Eliminar', onClick: (row) => this.delete(row) }
  ];
}
```

---

## 🔧 Mantenimiento

### Agregar nuevo componente UI

1. Crear carpeta en la categoría apropiada:
   ```bash
   mkdir src/app/shared/ui/[categoria]/[nombre-componente]
   ```

2. Crear archivos del componente:
   - `[nombre-componente].component.ts`
   - `[nombre-componente].component.html`
   - `[nombre-componente].component.css`

3. Seguir convenciones:
   - Usar signals para inputs/outputs
   - Usar `ChangeDetectionStrategy.OnPush`
   - Componente standalone
   - Documentar en este README

4. Exportar interfaces si es necesario

---

## 📚 Referencias

- [Angular Signals](https://angular.io/guide/signals)
- [Standalone Components](https://angular.io/guide/standalone-components)
- [Change Detection](https://angular.io/guide/change-detection)

---

**Última actualización:** 2026-03-05
**Versión:** 1.0.0
