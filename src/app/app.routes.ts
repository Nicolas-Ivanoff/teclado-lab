import { Routes } from '@angular/router';
import {
  ROTA_FORM_CAPACITOR,
  ROTA_FORM_SERVICO,
} from 'src/core/constants/modo-teclado.constants';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./home/pages/home/home.page').then((modulo) => modulo.HomePage),
  },
  {
    path: ROTA_FORM_SERVICO,
    loadComponent: () =>
      import('./formulario/pages/form-servico/form-servico.page').then(
        (modulo) => modulo.FormServicoPage,
      ),
  },
  {
    path: ROTA_FORM_CAPACITOR,
    loadComponent: () =>
      import('./formulario/pages/form-capacitor/form-capacitor.page').then(
        (modulo) => modulo.FormCapacitorPage,
      ),
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];
