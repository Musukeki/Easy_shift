import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { registerLocaleData } from '@angular/common';
import localeZh from '@angular/common/locales/zh-Hant';
import { provideHttpClient } from '@angular/common/http';
registerLocaleData(localeZh);

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes) ,{ provide: LOCALE_ID, useValue: 'zh-Hant' },provideHttpClient()]
};
