import { Routes } from '@angular/router';
import {
  ModoTecladoEnum,
  ROTA_POR_MODO,
} from 'src/core/constants/modo-teclado.constants';

const carregarFormularioCapacitor = () =>
  import('./formulario/pages/form-capacitor/form-capacitor.page').then(
    (modulo) => modulo.FormCapacitorPage,
  );

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./home/pages/home/home.page').then((modulo) => modulo.HomePage),
  },
  {
    path: ROTA_POR_MODO[ModoTecladoEnum.SERVICO],
    loadComponent: () =>
      import('./formulario/pages/form-servico/form-servico.page').then(
        (modulo) => modulo.FormServicoPage,
      ),
  },
  {
    path: ROTA_POR_MODO[ModoTecladoEnum.NONE],
    loadComponent: carregarFormularioCapacitor,
  },
  {
    path: ROTA_POR_MODO[ModoTecladoEnum.BODY],
    loadComponent: carregarFormularioCapacitor,
  },
  {
    path: ROTA_POR_MODO[ModoTecladoEnum.IONIC],
    loadComponent: carregarFormularioCapacitor,
  },
  {
    path: ROTA_POR_MODO[ModoTecladoEnum.NATIVE],
    loadComponent: carregarFormularioCapacitor,
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];
