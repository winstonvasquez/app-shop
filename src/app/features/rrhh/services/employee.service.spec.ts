import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EmployeeService, Employee, EmployeeRequest } from './employee.service';
import { environment } from '@env/environment';

describe('EmployeeService', () => {
    let service: EmployeeService;
    let httpMock: HttpTestingController;
    const baseUrl = `${environment.apiUrl}/hr/api/employees`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [EmployeeService]
        });
        service = TestBed.inject(EmployeeService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should load employees', async () => {
        const mockEmployees: Employee[] = [
            {
                id: 1,
                tenantId: 1,
                codigoEmpleado: 'EMP001',
                nombres: 'Juan',
                apellidos: 'Pérez',
                documentoIdentidad: '12345678',
                fechaIngreso: '2024-01-01',
                estado: 'ACTIVO',
                createdAt: '2024-01-01'
            }
        ];

        const loadPromise = service.loadEmployees();

        const req = httpMock.expectOne(baseUrl);
        expect(req.request.method).toBe('GET');
        req.flush(mockEmployees);

        await loadPromise;

        expect(service.employees()).toEqual(mockEmployees);
        expect(service.totalEmployees()).toBe(1);
    });

    it('should create employee', async () => {
        const request: EmployeeRequest = {
            codigoEmpleado: 'EMP002',
            nombres: 'María',
            apellidos: 'García',
            documentoIdentidad: '87654321',
            fechaIngreso: '2024-03-01'
        };

        const mockResponse: Employee = {
            id: 2,
            tenantId: 1,
            ...request,
            estado: 'ACTIVO',
            createdAt: '2024-03-01'
        };

        const createPromise = service.createEmployee(request);

        const req = httpMock.expectOne(baseUrl);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(request);
        req.flush(mockResponse);

        const result = await createPromise;

        expect(result).toEqual(mockResponse);
        expect(service.employees()).toContain(mockResponse);
    });

    it('should update employee', async () => {
        const employeeId = 1;
        const request: EmployeeRequest = {
            codigoEmpleado: 'EMP001',
            nombres: 'Juan Carlos',
            apellidos: 'Pérez',
            documentoIdentidad: '12345678',
            fechaIngreso: '2024-01-01'
        };

        const mockResponse: Employee = {
            id: employeeId,
            tenantId: 1,
            ...request,
            estado: 'ACTIVO',
            createdAt: '2024-01-01',
            updatedAt: '2024-03-05'
        };

        service['_employees'].set([{
            id: employeeId,
            tenantId: 1,
            codigoEmpleado: 'EMP001',
            nombres: 'Juan',
            apellidos: 'Pérez',
            documentoIdentidad: '12345678',
            fechaIngreso: '2024-01-01',
            estado: 'ACTIVO',
            createdAt: '2024-01-01'
        }]);

        const updatePromise = service.updateEmployee(employeeId, request);

        const req = httpMock.expectOne(`${baseUrl}/${employeeId}`);
        expect(req.request.method).toBe('PUT');
        req.flush(mockResponse);

        const result = await updatePromise;

        expect(result.nombres).toBe('Juan Carlos');
        expect(service.employees()[0].nombres).toBe('Juan Carlos');
    });

    it('should deactivate employee', async () => {
        const employeeId = 1;

        service['_employees'].set([{
            id: employeeId,
            tenantId: 1,
            codigoEmpleado: 'EMP001',
            nombres: 'Juan',
            apellidos: 'Pérez',
            documentoIdentidad: '12345678',
            fechaIngreso: '2024-01-01',
            estado: 'ACTIVO',
            createdAt: '2024-01-01'
        }]);

        const deactivatePromise = service.deactivateEmployee(employeeId);

        const req = httpMock.expectOne(`${baseUrl}/${employeeId}/deactivate`);
        expect(req.request.method).toBe('PATCH');
        req.flush(null);

        await deactivatePromise;

        expect(service.employees()[0].estado).toBe('INACTIVO');
    });

    it('should filter active employees', () => {
        service['_employees'].set([
            {
                id: 1,
                tenantId: 1,
                codigoEmpleado: 'EMP001',
                nombres: 'Juan',
                apellidos: 'Pérez',
                documentoIdentidad: '12345678',
                fechaIngreso: '2024-01-01',
                estado: 'ACTIVO',
                createdAt: '2024-01-01'
            },
            {
                id: 2,
                tenantId: 1,
                codigoEmpleado: 'EMP002',
                nombres: 'María',
                apellidos: 'García',
                documentoIdentidad: '87654321',
                fechaIngreso: '2024-02-01',
                estado: 'INACTIVO',
                createdAt: '2024-02-01'
            }
        ]);

        expect(service.activeEmployees().length).toBe(1);
        expect(service.activeEmployees()[0].codigoEmpleado).toBe('EMP001');
    });
});
