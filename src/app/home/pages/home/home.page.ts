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
  ModoTecladoEnum,
  ROTA_POR_MODO,
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
  protected readonly modos = Object.values(ModoTecladoEnum);

  protected abrirFormulario(modo: ModoTecladoEnum): void {
    // Recarregamento completo: o modo do teclado e decidido no bootstrap e o
    // KeyboardScrollService nao consegue ser desligado depois do init().
    window.location.assign(`/${ROTA_POR_MODO[modo]}`);
  }
}
