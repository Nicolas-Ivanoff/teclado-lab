import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import {
  getModoTecladoAtual,
  ModoTecladoEnum,
} from './core/constants/modo-teclado.constants';

// No modo "servico" o scrollAssist/scrollPadding do Ionic ficam desligados (igual ao e-commerce),
// porque o KeyboardScrollService cuida do scroll. No modo "capacitor" ficam ligados.
const usarScrollAssistDoIonic =
  getModoTecladoAtual() === ModoTecladoEnum.CAPACITOR;

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({
      mode: 'md',
      scrollAssist: usarScrollAssistDoIonic,
      scrollPadding: usarScrollAssistDoIonic,
    }),
    provideRouter(routes),
  ],
}).catch((erro) => console.error(erro));
