import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  NgZone,
  signal,
} from '@angular/core';

/** Ligue/desligue a barra de diagnostico aqui. */
export const EXIBIR_DEBUG_VIEWPORT = true;

interface LeituraViewport {
  alturaJanela: number;
  alturaViewportVisual: number;
  espacadorTeclado: string;
  scrollTopConteudo: number;
}

/**
 * Barra fixa no topo com valores que ajudam a comparar os dois modos no aparelho:
 * innerHeight, visualViewport.height, --keyboard-safe-area e scrollTop do ion-content visivel.
 */
@Component({
  selector: 'app-debug-viewport',
  standalone: true,
  templateUrl: './debug-viewport.component.html',
  styleUrl: './debug-viewport.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebugViewportComponent {
  private readonly _zone = inject(NgZone);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly exibir = EXIBIR_DEBUG_VIEWPORT;
  protected readonly leitura = signal<LeituraViewport>({
    alturaJanela: window.innerHeight,
    alturaViewportVisual: window.visualViewport?.height ?? 0,
    espacadorTeclado: '0px',
    scrollTopConteudo: 0,
  });

  constructor() {
    if (!this.exibir) {
      return;
    }

    this._zone.runOutsideAngular(() => {
      const intervalo = setInterval(() => this._atualizar(), 250);
      this._destroyRef.onDestroy(() => clearInterval(intervalo));
    });
  }

  private async _atualizar(): Promise<void> {
    const conteudos = Array.from(
      document.querySelectorAll<HTMLIonContentElement>(
        'ion-content',
      ),
    );
    const conteudoVisivel = conteudos.find(
      (elemento) => !elemento.closest('.ion-page-hidden'),
    );
    const elementoScroll = await conteudoVisivel?.getScrollElement();

    this.leitura.set({
      alturaJanela: Math.round(window.innerHeight),
      alturaViewportVisual: Math.round(window.visualViewport?.height ?? 0),
      espacadorTeclado:
        document.documentElement.style.getPropertyValue(
          '--keyboard-safe-area',
        ) || '0px',
      scrollTopConteudo: Math.round(elementoScroll?.scrollTop ?? 0),
    });
  }
}
