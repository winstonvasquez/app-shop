import { ApplicationConfig, provideBrowserGlobalErrorListeners, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import {
  LUCIDE_ICONS, LucideIconProvider,
  // Estado / feedback
  X, CircleCheck, CircleAlert, TriangleAlert, AlertTriangle, Info, CheckCircle, XCircle,
  // Navegación
  ArrowLeft, ArrowRight, ArrowRightCircle, ArrowRightLeft,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  // Acciones / formularios
  Ban, BookOpen, Check, ClipboardCheck, Clock, Copy, DoorOpen, DoorClosed, Download,
  Eye, EyeOff, FilePlus, FileSearch, FileText, Filter, SlidersHorizontal,
  GitCompare, HeartOff, Heart, Key, KeyRound, Layers, Link, Lock, LockOpen, LogIn,
  Pencil, Percent, Play, Plus, Minus, Power, Printer, Receipt, RefreshCw, RotateCcw,
  Save, Search, Send, Trash2, UserMinus, Wallet,
  // Comercio / shop DS
  Package, PackageCheck, PackageSearch, ShoppingBag, ShoppingCart, Ticket, Tag,
  Truck, MapPin, Mail, Phone, User, Home, Bell, Box,
  // Layout / catalogo
  LayoutGrid, List, Grid3x3,
  // Marca / destacados
  Award, Star, Sparkles, Flame, Zap, Bolt, Shield, ShieldCheck, Settings,
  // Tiempo
  Timer,
  // Misc DS
  MessageCircle, MessageCircleQuestion
} from 'lucide-angular';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch, HttpClient, HttpBackend } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { authInterceptor } from '@core/auth/auth.interceptor';
import { languageInterceptor } from '@core/interceptors/language.interceptor';
import { tenantInterceptor } from '@core/interceptors/tenant.interceptor';
import { httpErrorInterceptor } from '@core/interceptors/http-error.interceptor';
import { HttpLoaderFactory } from '@core/i18n/custom-translate-loader';
import { LanguageService } from '@core/i18n/language.service';
import { lastValueFrom } from 'rxjs';
import { GoogleLoginProvider, FacebookLoginProvider, SOCIAL_AUTH_CONFIG } from '@abacritt/angularx-social-login';
import type { SocialAuthServiceConfig } from '@abacritt/angularx-social-login';
import { environment } from '@env/environment';

import { routes } from './app.routes';

import { SystemParameterService } from '@core/services/system-parameter.service';
import { StoreConfigService } from '@core/services/store-config.service';
import { WishlistService } from '@core/services/wishlist.service';

/**
 * APP_INITIALIZER factory: returns a Promise Angular awaits before rendering.
 * Calls LanguageService.initializeTranslations() which loads the JSON file.
 * Since translate.use() is NOT called in LanguageService constructor, there
 * is no race condition — this is the single source of translation loading.
 */
export function initTranslations(languageService: LanguageService) {
  return (): Promise<unknown> => lastValueFrom(languageService.initializeTranslations());
}

export function initSystemParameters(systemParameterService: SystemParameterService) {
  return (): Promise<unknown> => lastValueFrom(systemParameterService.loadParameters());
}

export function initStoreConfig(storeConfigService: StoreConfigService) {
  return (): Promise<unknown> => {
    const savedLang = localStorage.getItem('app-language') || 'es';
    return lastValueFrom(storeConfigService.loadConfig(savedLang));
  };
}

export function initWishlist(wishlistService: WishlistService) {
  return (): void => {
    wishlistService.loadWishlist();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, languageInterceptor, tenantInterceptor, httpErrorInterceptor]),
      withFetch()
    ),
    importProvidersFrom(
      TranslateModule.forRoot({
        fallbackLang: 'es',
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpBackend]
        }
      })
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initTranslations,
      deps: [LanguageService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initSystemParameters,
      deps: [SystemParameterService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initStoreConfig,
      deps: [StoreConfigService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initWishlist,
      deps: [WishlistService],
      multi: true
    },
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({
        // Estado / feedback
        X, CircleCheck, CircleAlert, TriangleAlert, AlertTriangle, Info, CheckCircle, XCircle,
        // Navegación
        ArrowLeft, ArrowRight, ArrowRightCircle, ArrowRightLeft,
        ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
        // Acciones / formularios
        Ban, BookOpen, Check, ClipboardCheck, Clock, Copy, DoorOpen, DoorClosed, Download,
        Eye, EyeOff, FilePlus, FileSearch, FileText, Filter, SlidersHorizontal,
        GitCompare, HeartOff, Heart, Key, KeyRound, Layers, Link, Lock, LockOpen, LogIn,
        Pencil, Percent, Play, Plus, Minus, Power, Printer, Receipt, RefreshCw, RotateCcw,
        Save, Search, Send, Trash2, UserMinus, Wallet,
        // Comercio / shop DS
        Package, PackageCheck, PackageSearch, ShoppingBag, ShoppingCart, Ticket, Tag,
        Truck, MapPin, Mail, Phone, User, Home, Bell, Box,
        // Layout / catálogo
        LayoutGrid, List, Grid3x3,
        // Marca / destacados
        Award, Star, Sparkles, Flame, Zap, Bolt, Shield, ShieldCheck, Settings,
        // Tiempo
        Timer,
        // Misc
        MessageCircle, MessageCircleQuestion
      }),
      multi: true
    },
    {
      provide: SOCIAL_AUTH_CONFIG,
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(environment.socialAuth.googleClientId, {
              oneTapEnabled: false,
              prompt: ''
            })
          },
          {
            id: FacebookLoginProvider.PROVIDER_ID,
            provider: new FacebookLoginProvider(environment.socialAuth.facebookAppId)
          }
        ],
        onError: (err: unknown) => {
          console.error('Social Login Config Error', err);
        }
      } as SocialAuthServiceConfig,
    }
  ]
};
