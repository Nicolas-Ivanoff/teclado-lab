import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  IonApp,
  IonRouterOutlet,
  Platform,
} from '@ionic/angular/standalone';
import { DebugViewportComponent } from 'src/core/components/debug-viewport/debug-viewport.component';
import {
  ehModoServico,
  getModoTecladoAtual,
  RESIZE_POR_MODO,
} from 'src/core/constants/modo-teclado.constants';
import { KeyboardScrollService } from 'src/core/services/keyboard/keyboard-scroll.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, DebugViewportComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly _platform = inject(Platform);
  private readonly _keyboardScrollService = inject(KeyboardScrollService);

  private readonly _amareloForma = '#FFE234';

  constructor() {
    this._initializeApp();
  }

  private _initializeApp(): void {
    this._platform.ready().then(() => {
      try {
        if (Capacitor.getPlatform() === 'web') {
          return;
        }

        StatusBar.setOverlaysWebView({ overlay: false }).then();
        StatusBar.setBackgroundColor({ color: this._amareloForma }).then();
        StatusBar.setStyle({ style: Style.Light }).then();
        StatusBar.show().then();

        if (Capacitor.getPlatform() === 'ios') {
          document.body.classList.add('ios');
        }

        this._configurarTeclado();
      } catch (erro) {
        console.warn('Erro ao configurar a plataforma', erro);
      }
    });
  }

  private _configurarTeclado(): void {
    const modo = getModoTecladoAtual();

    if (ehModoServico(modo)) {
      this._keyboardScrollService.init();
      return;
    }

    Keyboard.setResizeMode({ mode: RESIZE_POR_MODO[modo] }).then();
  }
}
