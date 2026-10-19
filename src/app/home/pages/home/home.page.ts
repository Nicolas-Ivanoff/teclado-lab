import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import {
  getModoTecladoAtual,
  ROTA_FORM_CAPACITOR,
  ROTA_FORM_SERVICO,
} from 'src/core/constants/modo-teclado.constants';
import { TEXTOS } from 'src/core/constants/textos.constants';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToolbar],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly textos = TEXTOS.home;
  protected readonly plataforma = Capacitor.getPlatform();
  protected readonly modoAtivo = getModoTecladoAtual();

  protected abrirFormularioServico(): void {
    this._recarregarEm(ROTA_FORM_SERVICO);
  }

  protected abrirFormularioCapacitor(): void {
    this._recarregarEm(ROTA_FORM_CAPACITOR);
  }

  /**
   * Recarregamento completo: o modo do teclado e decidido no bootstrap e o
   * KeyboardScrollService nao consegue ser desligado depois do init().
   */
  private _recarregarEm(rota: string): void {
    window.location.assign(`/${rota}`);
  }
}
