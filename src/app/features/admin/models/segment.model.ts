export interface SegmentResponse {
    id: number;
    nombre: string;
    descripcion: string;
    color: string;
    tipoCliente: string;
    totalClientes: number;
    activo: boolean;
    fechaCreacion: string;
}

export interface SegmentRequest {
    nombre: string;
    descripcion: string;
    color: string;
    tipoCliente: string;
    activo: boolean;
}

export const TIPO_CLIENTE_OPTIONS: { value: string; label: string }[] = [
    { value: 'VIP',       label: 'VIP'       },
    { value: 'REGULAR',   label: 'Regular'   },
    { value: 'OCASIONAL', label: 'Ocasional' },
    { value: 'MAYORISTA', label: 'Mayorista' }
];

export const SEGMENT_COLOR_OPTIONS: { value: string; label: string }[] = [
    { value: '#d7132a', label: 'Rojo'     },
    { value: '#FB8C00', label: 'Naranja'  },
    { value: '#059669', label: 'Verde'    },
    { value: '#2563eb', label: 'Azul'     },
    { value: '#7c3aed', label: 'Púrpura'  },
    { value: '#0891b2', label: 'Celeste'  }
];
