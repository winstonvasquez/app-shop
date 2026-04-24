/*
 * Public API Surface of @microshop/auth-lib
 *
 * Consumed by all MFEs (mfe-pos, mfe-comercial, mfe-operaciones, etc.)
 * to access authentication, authorization and tenant context.
 */

// Auth DTOs & models (includes User, LoginRequest, LoginResponse, etc.)
export * from '@core/auth/auth.model';

// Auth service & guards
export { AuthService } from '@core/auth/auth.service';
export { authGuard } from '@core/auth/auth.guard';
export { moduleGuard } from '@core/auth/module.guard';

// UserStore (class only — User interface comes from auth.model to avoid duplicate)
export { UserStore } from '@core/auth/user.store';

// HTTP interceptors — register via withInterceptors([]) in each MFE's bootstrapApplication
export { authInterceptor } from '@core/auth/auth.interceptor';
export { httpErrorInterceptor } from '@core/interceptors/http-error.interceptor';
export { languageInterceptor } from '@core/interceptors/language.interceptor';
export { loadingInterceptor } from '@core/interceptors/loading.interceptor';
export { tenantInterceptor } from '@core/interceptors/tenant.interceptor';

// SaaS / Multitenant models
export type { SaasModuleInfo, SaasPlanInfo, CompanyProfile, SaasRegisterPayload } from '@core/models/saas.model';

// Event bus — comunicación desacoplada entre MFEs
export { eventBus } from './lib/event-bus';
export type { MicroshopEventType, BreadcrumbEvent, NotificationEvent } from './lib/event-bus';
