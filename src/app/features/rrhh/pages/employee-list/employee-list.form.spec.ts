import { describe, expect, it } from 'vitest';
import { Employee } from '../../models/employee.model';
import {
    EstadoFiltrosEmpleado,
    filtrosDeEmpleado,
    formularioDesdeEmpleado,
    payloadDeEmpleado,
} from './employee-list.form';

/** Empleado con SOLO los campos obligatorios: todo lo opcional queda ausente. */
const empleadoMinimo: Employee = {
    id: 7,
    tenantId: 1,
    codigoEmpleado: 'EMP007',
    nombres: 'Ana',
    apellidos: 'Quispe',
    documentoIdentidad: '44556677',
    fechaIngreso: '2024-03-01',
    estado: 'ACTIVO',
    createdAt: '2024-03-01',
};

describe('formularioDesdeEmpleado', () => {
    it('copia tal cual los campos obligatorios', () => {
        const v = formularioDesdeEmpleado(empleadoMinimo);
        expect(v.codigoEmpleado).toBe('EMP007');
        expect(v.nombres).toBe('Ana');
        expect(v.apellidos).toBe('Quispe');
        expect(v.documentoIdentidad).toBe('44556677');
        expect(v.fechaIngreso).toBe('2024-03-01');
        expect(v.estado).toBe('ACTIVO');
    });

    it('sin opcionales: los textos caen a cadena vacía, nunca a null/undefined', () => {
        const v = formularioDesdeEmpleado(empleadoMinimo);
        expect(v.fechaNacimiento).toBe('');
        expect(v.genero).toBe('');
        expect(v.estadoCivil).toBe('');
        expect(v.cargo).toBe('');
        expect(v.area).toBe('');
        expect(v.email).toBe('');
        expect(v.telefono).toBe('');
        expect(v.afpNombre).toBe('');
        expect(v.fechaSalida).toBe('');
        expect(v.motivoSalida).toBe('');
    });

    it('sin opcionales: las claves foráneas caen a null', () => {
        const v = formularioDesdeEmpleado(empleadoMinimo);
        expect(v.departmentId).toBeNull();
        expect(v.positionId).toBeNull();
        expect(v.supervisorId).toBeNull();
        expect(v.userId).toBeNull();
    });

    it('sin opcionales: aplica los defaults de negocio DNI y ONP', () => {
        const v = formularioDesdeEmpleado(empleadoMinimo);
        expect(v.tipoDocumento).toBe('DNI');
        expect(v.sistemaPrevisional).toBe('ONP');
    });

    it('con todo relleno no pisa ningún valor guardado', () => {
        const v = formularioDesdeEmpleado({
            ...empleadoMinimo,
            tipoDocumento: 'CARNET_EXTRANJERIA',
            fechaNacimiento: '1990-05-20',
            genero: 'FEMENINO',
            estadoCivil: 'CASADO',
            cargo: 'Analista',
            area: 'TI',
            email: 'ana@microshop.pe',
            telefono: '999888777',
            departmentId: 3,
            positionId: 4,
            supervisorId: 5,
            userId: 6,
            sistemaPrevisional: 'AFP',
            afpNombre: 'INTEGRA',
            fechaSalida: '2026-01-31',
            motivoSalida: 'Renuncia',
        });
        expect(v.tipoDocumento).toBe('CARNET_EXTRANJERIA');
        expect(v.fechaNacimiento).toBe('1990-05-20');
        expect(v.genero).toBe('FEMENINO');
        expect(v.estadoCivil).toBe('CASADO');
        expect(v.cargo).toBe('Analista');
        expect(v.area).toBe('TI');
        expect(v.email).toBe('ana@microshop.pe');
        expect(v.telefono).toBe('999888777');
        expect(v.departmentId).toBe(3);
        expect(v.positionId).toBe(4);
        expect(v.supervisorId).toBe(5);
        expect(v.userId).toBe(6);
        expect(v.sistemaPrevisional).toBe('AFP');
        expect(v.afpNombre).toBe('INTEGRA');
        expect(v.fechaSalida).toBe('2026-01-31');
        expect(v.motivoSalida).toBe('Renuncia');
    });

    it('un empleado en AFP no se degrada al default ONP', () => {
        const v = formularioDesdeEmpleado({ ...empleadoMinimo, sistemaPrevisional: 'AFP' });
        expect(v.sistemaPrevisional).toBe('AFP');
    });

    it('el id 0 de una FK es un id legítimo y no se convierte en null', () => {
        const v = formularioDesdeEmpleado({ ...empleadoMinimo, departmentId: 0, userId: 0 });
        expect(v.departmentId).toBe(0);
        expect(v.userId).toBe(0);
    });
});

const filtrosVacios: EstadoFiltrosEmpleado = {
    search: '',
    estado: '',
    departmentId: null,
    positionId: null,
    supervisorId: null,
    tipoDocumento: '',
    sistemaPrevisional: '',
    afpNombre: '',
    genero: '',
    estadoCivil: '',
};

describe('filtrosDeEmpleado', () => {
    it('sin filtros: todo texto vacío sale como undefined (toHttpParams lo omite)', () => {
        const f = filtrosDeEmpleado(filtrosVacios, 0, 20);
        expect(f.search).toBeUndefined();
        expect(f.status).toBeUndefined();
        expect(f.tipoDocumento).toBeUndefined();
        expect(f.sistemaPrevisional).toBeUndefined();
        expect(f.afpNombre).toBeUndefined();
        expect(f.genero).toBeUndefined();
        expect(f.estadoCivil).toBeUndefined();
    });

    it('sin filtros: los rangos de fecha ausentes se quedan undefined', () => {
        const f = filtrosDeEmpleado(filtrosVacios, 0, 20);
        expect(f.fechaIngresoDesde).toBeUndefined();
        expect(f.fechaIngresoHasta).toBeUndefined();
        expect(f.fechaSalidaDesde).toBeUndefined();
        expect(f.fechaSalidaHasta).toBeUndefined();
        expect(f.fechaNacimientoDesde).toBeUndefined();
        expect(f.fechaNacimientoHasta).toBeUndefined();
    });

    it('la paginación siempre viaja, incluso sin ningún filtro', () => {
        const f = filtrosDeEmpleado(filtrosVacios, 3, 50);
        expect(f.page).toBe(3);
        expect(f.size).toBe(50);
    });

    it('con todo relleno traslada cada filtro a su parámetro', () => {
        const f = filtrosDeEmpleado(
            {
                search: 'quispe',
                estado: 'ACTIVO',
                departmentId: 3,
                positionId: 4,
                supervisorId: 5,
                tipoDocumento: 'DNI',
                sistemaPrevisional: 'AFP',
                afpNombre: 'PRIMA',
                genero: 'FEMENINO',
                estadoCivil: 'CASADO',
                fechaIngresoDesde: '2024-01-01',
                fechaIngresoHasta: '2024-12-31',
                fechaSalidaDesde: '2025-01-01',
                fechaSalidaHasta: '2025-12-31',
                fechaNacimientoDesde: '1980-01-01',
                fechaNacimientoHasta: '2000-12-31',
            },
            1,
            20,
        );
        expect(f.search).toBe('quispe');
        expect(f.status).toBe('ACTIVO');
        expect(f.departmentId).toBe(3);
        expect(f.positionId).toBe(4);
        expect(f.supervisorId).toBe(5);
        expect(f.tipoDocumento).toBe('DNI');
        expect(f.sistemaPrevisional).toBe('AFP');
        expect(f.afpNombre).toBe('PRIMA');
        expect(f.genero).toBe('FEMENINO');
        expect(f.estadoCivil).toBe('CASADO');
        expect(f.fechaIngresoDesde).toBe('2024-01-01');
        expect(f.fechaNacimientoHasta).toBe('2000-12-31');
    });

    it('una FK en null se pasa tal cual: el backend la trata como "sin filtro"', () => {
        const f = filtrosDeEmpleado(filtrosVacios, 0, 20);
        expect(f.departmentId).toBeNull();
        expect(f.positionId).toBeNull();
        expect(f.supervisorId).toBeNull();
    });
});

describe('payloadDeEmpleado', () => {
    const formulario = {
        codigoEmpleado: 'EMP007',
        nombres: 'Ana',
        apellidos: 'Quispe',
        genero: '',
        estadoCivil: '',
        cargo: 'Analista',
    };

    it('en alta (sin original) manda solo lo del formulario', () => {
        const p = payloadDeEmpleado({ ...formulario }, null) as unknown as Record<string, unknown>;
        expect(p['codigoEmpleado']).toBe('EMP007');
        expect(p['cargo']).toBe('Analista');
        expect(p['id']).toBeUndefined();
    });

    it("genero y estadoCivil en '' salen como undefined (Jackson rechaza '' en un enum)", () => {
        const p = payloadDeEmpleado({ ...formulario }, null) as unknown as Record<string, unknown>;
        expect(p['genero']).toBeUndefined();
        expect(p['estadoCivil']).toBeUndefined();
    });

    it('un genero/estadoCivil elegido de verdad NO se pisa', () => {
        const p = payloadDeEmpleado(
            { ...formulario, genero: 'FEMENINO', estadoCivil: 'CASADO' },
            null,
        ) as unknown as Record<string, unknown>;
        expect(p['genero']).toBe('FEMENINO');
        expect(p['estadoCivil']).toBe('CASADO');
    });

    it('en edición conserva los campos del original que el drawer no muestra', () => {
        const original: Employee = {
            ...empleadoMinimo,
            direccion: 'Av. Siempre Viva 742',
            nacionalidad: 'PERUANA',
            profesion: 'Contadora',
        };
        const p = payloadDeEmpleado({ ...formulario }, original) as unknown as Record<string, unknown>;
        expect(p['direccion']).toBe('Av. Siempre Viva 742');
        expect(p['nacionalidad']).toBe('PERUANA');
        expect(p['profesion']).toBe('Contadora');
    });

    it('en edición el formulario gana sobre el original', () => {
        const original: Employee = { ...empleadoMinimo, cargo: 'Practicante', nombres: 'Anita' };
        const p = payloadDeEmpleado({ ...formulario }, original) as unknown as Record<string, unknown>;
        expect(p['cargo']).toBe('Analista');
        expect(p['nombres']).toBe('Ana');
    });

    it("en edición un '' de genero anula el genero que traía el original", () => {
        const original: Employee = { ...empleadoMinimo, genero: 'MASCULINO' };
        const p = payloadDeEmpleado({ ...formulario }, original) as unknown as Record<string, unknown>;
        expect(p['genero']).toBeUndefined();
    });

    it('no muta el objeto de entrada', () => {
        const entrada = { ...formulario };
        payloadDeEmpleado(entrada, null);
        expect(entrada.genero).toBe('');
        expect(entrada.estadoCivil).toBe('');
    });
});
