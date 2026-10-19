import { DestroyRef, inject, Injectable } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { filter, Subject } from 'rxjs';
import { SafeAny } from 'src/core/types/safe-any';

/**
 * Gerencia o comportamento do teclado virtual em iOS e Android:
 *
 *  • KeyboardResize.None — mantém o viewport estável; o teclado sobrepõe o
 *    conteúdo em vez de encolher o WebView, evitando o inflate de maxScrollTop.
 *
 *  • --keyboard-safe-area (iOS) — variável CSS setada no <html> que empurra o
 *    botão footer acima do teclado via spacer ::after + margin-top: auto.
 *    O spacer sobe imediatamente (keyboardWillShow) e desce com animação
 *    ease-out sincronizada à saída do teclado (keyboardWillHide).
 *
 *  • Scroll fix — garante que o input focado fique visível acima do teclado,
 *    desfazendo o auto-scroll indesejado do WKWebView quando necessário.
 */
@Injectable({ providedIn: 'root' })
export class KeyboardScrollService {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _router = inject(Router);

  // ── Public events ────────────────────────────────────────────────────────────
  /**
   * Emite (void) toda vez que o --keyboard-safe-area chega a 0 após uma
   * animação de fechamento de teclado.
   *
   * Use em páginas com cdk-virtual-scroll-viewport para forçar um
   * checkViewportSize() após o spacer sumir, corrigindo o buraco em branco
   * causado pelo ResizeObserver do CDK não detectar a mudança de tamanho
   * quando `contain: strict` está ativo no elemento.
   */
  public readonly spacerZeroed$ = new Subject<void>();

  // ── Keyboard state ──────────────────────────────────────────────────────────
  private _keyboardHeight = 0;
  /** true durante a animação de abertura do teclado (willShow → didShow) */
  private _keyboardAnimating = false;
  private _focusListener?: (ev: Event) => void;
  private _pendingFocusEl?: HTMLElement;
  /**
   * scrollTop do ion-content capturado em `focusin`, antes do iOS iniciar seu
   * auto-scroll. Usado para desfazer o scroll indesejado do WKWebView em
   * _ensureFocusedElementVisible.
   */
  private _savedScrollTopOnFocus?: number;

  // ── Spacer state (iOS only) ─────────────────────────────────────────────────
  /**
   * Timer que aguarda para limpar o spacer após keyboardWillHide.
   * Em troca de campo (hide → show rápido), keyboardWillShow cancela o timer
   * para o spacer não ser zerado antes do novo campo aparecer.
   */
  private _hideSpacerTimer?: ReturnType<typeof setTimeout>;
  /**
   * true enquanto o teclado está abrindo ou aberto.
   * keyboardDidHide usa essa flag para não zerar o spacer em trocas de campo.
   */
  private _keyboardShowFired = false;
  /**
   * true durante uma transição de rota.
   * Usado para abortar a animação do spacer e zerá-lo imediatamente,
   * garantindo que o CDK virtual scroll da página destino inicialize
   * com o tamanho correto (sem o spacer residual inflado).
   */
  private _navigationInProgress = false;
  /**
   * true após keyboardDidShow, false após keyboardDidHide.
   * Reflete se o teclado está REALMENTE visível (confirmado pelo OS),
   * diferente de _keyboardShowFired que muda em willShow/willHide.
   * Usado para detectar willShow espúrios (ex.: clear button do searchbar)
   * que abortam a animação do spacer mas o teclado não chega a abrir.
   */
  private _keyboardVisible = false;

  // ── Layout constants ────────────────────────────────────────────────────────
  /** Margem mínima (px) entre bordas visíveis e elementos de layout */
  private readonly _MARGIN = 16;
  /** Reserva (px) para o error-text do ion-input, renderizado fora do box do host */
  private readonly _HINT_RESERVE = 28;
  /**
   * Scroll mínimo disponível (px) acima do input para permitir que o botão
   * seja perseguido via scroll. Abaixo desse valor, o input está próximo ao
   * topo — scrollar para o botão o empurraria atrás do header.
   */
  private readonly _MIN_SCROLL_ROOM = 80;
  /**
   * Duração (ms) da animação ease-out do spacer ao fechar o teclado.
   * Ajuste para sincronizar com a animação de saída do teclado no dispositivo.
   * Valor atual ligeiramente abaixo da animação iOS (~350ms) para o botão
   * terminar de descer antes do teclado sumir completamente.
   */
  private readonly _SPACER_ANIM_MS = 280;

  // ═══════════════════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════════════════

  public init(): void {
    // KeyboardResize.None: o layout é gerenciado manualmente via spacer CSS e
    // scroll programático — evita o inflate de maxScrollTop causado pelo
    // KeyboardResize.Ionic (~200ms após o teclado abrir).
    Keyboard.setResizeMode({ mode: KeyboardResize.None }).then();

    console.log('[KBD] init:device', {
      platform: Capacitor.getPlatform(),
      screenH: window.screen.height,
      screenW: window.screen.width,
      innerH: window.innerHeight,
      dpr: window.devicePixelRatio,
    });

    if (Capacitor.getPlatform() === 'ios') {
      this._configureKeyboardSafeAreaIOS();
    }

    this._initKeyboardScrollFix();
    this._initNavigationGuard();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Safe-area spacer — iOS only
  // ═══════════════════════════════════════════════════════════════════════════

  private _configureKeyboardSafeAreaIOS(): void {
    Keyboard.addListener('keyboardWillShow', (ev) => {
      console.log('[KBD] willShow', {
        kbH: ev.keyboardHeight,
        currentSpacer: this._readSpacer(),
        activeTag: (document.activeElement as HTMLElement)?.tagName,
      });
      this._keyboardShowFired = true;
      this._applySpacerOnShow(ev.keyboardHeight ?? 0);
    });

    Keyboard.addListener('keyboardWillHide', () => {
      console.log('[KBD] willHide', { currentSpacer: this._readSpacer() });
      this._keyboardShowFired = false;
      this._clampScrollTops(80, 250);
      this._animateSpacerToZero();
    });

    Keyboard.addListener('keyboardDidHide', () => {
      this._keyboardVisible = false;
      console.log('[KBD] didHide', { currentSpacer: this._readSpacer() });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Navigation guard — zera o spacer imediatamente ao navegar
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Ouve NavigationStart do Router para zerar o spacer antes que a página
   * destino inicialize o CDK virtual scroll.
   *
   * PROBLEMA:
   *   A animação de saída do spacer (280ms ease-out) coincide com a transição
   *   de rota do Ionic (~300ms). O CDK virtual scroll da nova página executa
   *   ngAfterViewInit durante essa janela — quando o spacer ainda está em ~200px
   *   — e mede um viewport menor do que o real. Como o `contain: strict` no
   *   `.cdk-virtual-scrollable` pode impedir o ResizeObserver do CDK de
   *   re-disparar após o spacer cair a 0, o viewport fica com tamanho errado
   *   e exibe um "buraco" em branco abaixo da lista de itens.
   *
   * SOLUÇÃO:
   *   Ao detectar uma navegação, zerar o spacer imediatamente (sem animação).
   *   O CDK então sempre inicializa com o tamanho correto.
   *
   *   Na mesma página (teclado fechando sem navegar), o spacer continua
   *   animando suavemente — `_navigationInProgress` permanece false.
   */
  private _initNavigationGuard(): void {
    this._router.events
      .pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => {
        const spacer = this._readSpacer();
        this._navigationInProgress = true;

        if (spacer > 0) {
          console.log('[KBD] navigation:zeroing spacer immediately', {
            spacer,
          });
          document.documentElement.style.setProperty(
            '--keyboard-safe-area',
            '0px',
          );
          this.spacerZeroed$.next();
        }

        // Reseta a flag assim que a microtask do router concluir para não
        // bloquear a próxima abertura de teclado na nova página.
        Promise.resolve().then(() => {
          this._navigationInProgress = false;
        });
      });
  }

  /** Lê o valor atual de --keyboard-safe-area do <html>. */
  private _readSpacer(): number {
    return (
      parseFloat(
        document.documentElement.style.getPropertyValue('--keyboard-safe-area'),
      ) || 0
    );
  }

  /**
   * Calcula e aplica o --keyboard-safe-area necessário para o botão footer
   * ficar exatamente acima do teclado.
   */
  private _applySpacerOnShow(keyboardHeight: number): void {
    const html = document.documentElement;
    const targetBtnBottom = window.innerHeight - keyboardHeight - this._MARGIN;

    // ── Troca rápida de campo (keyboardDidHide antes de keyboardWillShow) ─────
    // O timer de limpeza foi agendado mas o teclado já voltou — cancelamos
    // e recalculamos o spacer mantendo a posição natural do botão.
    if (this._hideSpacerTimer !== undefined) {
      clearTimeout(this._hideSpacerTimer);
      this._hideSpacerTimer = undefined;

      const currentSpacer = this._readSpacer();
      const naturalBtnBottom = targetBtnBottom + currentSpacer;
      const riseNeeded = Math.max(0, naturalBtnBottom - targetBtnBottom);
      console.log('[KBD] applySpacer:hideTimerPath', {
        targetBtnBottom,
        currentSpacer,
        riseNeeded,
      });
      html.style.setProperty('--keyboard-safe-area', `${riseNeeded}px`);
      return;
    }

    // ── Abertura normal: mede o botão e calcula o spacer ─────────────────────
    // Usamos a posição real do botão em vez de uma fórmula fixa (ex.: kbH + 16)
    // porque padding, margens e outros offsets variam por página/modal.
    //
    // Usamos o botão MAIS BAIXO (maior bottom) para garantir que TODOS os botões
    // visíveis (incluindo botões secundários abaixo do submit) fiquem acima do
    // teclado. Calcular com base apenas no [type="submit"] deixa botões
    // secundários parcialmente atrás do teclado.
    const btn = this._findLowestVisibleButton();
    const currentBtnBottom =
      btn?.getBoundingClientRect().bottom ?? window.innerHeight - this._MARGIN;
    const riseNeeded = Math.max(0, currentBtnBottom - targetBtnBottom);
    const currentSpacer = this._readSpacer();

    // Log todos os botões visíveis (Bug 1: botão secundário; Bug 2: botão selecionado)
    const visibleBtns = (
      Array.from(document.querySelectorAll('ion-button')) as HTMLElement[]
    )
      .filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.bottom > 0;
      })
      .map((b) => ({
        type: b.getAttribute('type'),
        class: b.className,
        bottom: Math.round(b.getBoundingClientRect().bottom),
        top: Math.round(b.getBoundingClientRect().top),
      }));
    console.log('[KBD] applySpacer:allButtons', {
      visibleBtns,
      targetBtnBottom,
    });

    console.log('[KBD] applySpacer:measure', {
      kbH: keyboardHeight,
      winH: window.innerHeight,
      targetBtnBottom,
      currentBtnBottom,
      currentSpacer,
      riseNeeded,
      btnFound: !!btn,
    });

    // Tolerância para o guard de troca de campo. Após o scroll programático,
    // o botão fica em coordenadas fracionárias (ex.: 475.6875 vs target 474),
    // gerando riseNeeded ≈ 1–4px puramente por sub-pixel rounding do layout
    // flex + scroll. Sem essa tolerância, iOS reemite `keyboardWillShow` na
    // troca de campo (ex.: Tel → Senha em login.page) e derrubamos o spacer
    // de 303 → 1.7, lançando o botão atrás do teclado.
    //
    // O valor (8px) cobre o ruído observado em telas reais sem mascarar
    // mudanças reais de layout (ex.: troca de altura de teclado em pt vs
    // emoji ≈ 50–80px de delta).
    const RISE_NOISE_TOLERANCE = 8;
    if (currentSpacer > 0 && riseNeeded < RISE_NOISE_TOLERANCE) {
      // Spacer já em vigor e botão essencialmente no alvo: ignorar reemissão
      // de willShow (troca de campo / sub-pixel).
      console.log('[KBD] applySpacer:skip (field switch, spacer holds)', {
        currentSpacer,
        riseNeeded,
      });
      return;
    }

    console.log('[KBD] applySpacer:set', {
      from: currentSpacer,
      to: riseNeeded,
    });
    html.style.setProperty('--keyboard-safe-area', `${riseNeeded}px`);
  }

  /**
   * Anima o --keyboard-safe-area de seu valor atual até 0 com ease-out,
   * sincronizando a descida do botão com a animação de saída do teclado.
   * Aborta silenciosamente se keyboardWillShow disparar durante a animação
   * (troca de campo).
   */
  private _animateSpacerToZero(): void {
    if (this._hideSpacerTimer !== undefined) {
      clearTimeout(this._hideSpacerTimer);
      this._hideSpacerTimer = undefined;
    }

    const html = document.documentElement;
    const startSpacer =
      parseFloat(html.style.getPropertyValue('--keyboard-safe-area')) || 0;

    if (startSpacer <= 0) {
      console.log('[KBD] animateSpacer:skip (spacer already 0)');
      return;
    }

    console.log('[KBD] animateSpacer:start', {
      startSpacer,
      durationMs: this._SPACER_ANIM_MS,
      navigationInProgress: this._navigationInProgress,
      t: performance.now().toFixed(0),
    });

    const t0 = performance.now();
    const tick = (): void => {
      if (this._keyboardShowFired) {
        const spacerAtAbort = this._readSpacer();
        console.log('[KBD] animateSpacer:abort (willShow fired during anim)', {
          spacerAtAbort,
          activeTag: (document.activeElement as HTMLElement)?.tagName,
          keyboardVisible: this._keyboardVisible,
        });

        // Rede de segurança para willShow espúrios (ex.: clear button do searchbar).
        // willShow é disparado mas o teclado nunca chega a abrir (didShow não vem).
        // Após a janela de tempo do keyboardDidShow (~400ms), se o teclado não
        // estiver realmente visível e o spacer ainda estiver setado, zeramos.
        //
        // Troca de campo real: didShow confirma que o teclado está aberto,
        // _keyboardVisible = true → o timeout não zera.
        window.setTimeout(() => {
          if (!this._keyboardVisible && this._readSpacer() > 0) {
            console.log(
              '[KBD] animateSpacer:fallback-zero (spurious willShow confirmed)',
              {
                spacer: this._readSpacer(),
                activeTag: (document.activeElement as HTMLElement)?.tagName,
              },
            );
            document.documentElement.style.setProperty(
              '--keyboard-safe-area',
              '0px',
            );
            this.spacerZeroed$.next();
          }
        }, 400);

        return; // troca de campo: aborta sem zerar imediatamente
      }

      if (this._navigationInProgress) {
        // Navegação detectada: spacer já foi zerado pelo _initNavigationGuard.
        // Aborta a animação para não sobrescrever o zero com valor intermediário.
        console.log('[KBD] animateSpacer:abort (navigation in progress)');
        return;
      }

      const p = Math.min((performance.now() - t0) / this._SPACER_ANIM_MS, 1);
      const eased = 1 - (1 - p) * (1 - p); // ease-out quadrático
      html.style.setProperty(
        '--keyboard-safe-area',
        `${startSpacer * (1 - eased)}px`,
      );

      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        html.style.setProperty('--keyboard-safe-area', '0px');
        console.log('[KBD] animateSpacer:done (spacer → 0)', {
          t: performance.now().toFixed(0),
        });
        this.spacerZeroed$.next();
      }
    };

    requestAnimationFrame(tick);
  }

  /**
   * Retorna o primeiro ion-button[type="submit"] visível na tela,
   * ou null se nenhum for encontrado.
   */
  private _findActiveSubmitButton(): HTMLElement | null {
    return (
      (
        Array.from(
          document.querySelectorAll('ion-button[type="submit"]'),
        ) as HTMLElement[]
      ).find((btn) => {
        const r = btn.getBoundingClientRect();
        return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
      }) ?? null
    );
  }

  /**
   * Retorna o ion-button visível com a maior posição bottom (mais próximo
   * do teclado). Usado em _applySpacerOnShow para garantir que todos os
   * botões visíveis — incluindo botões secundários abaixo do submit —
   * fiquem acima do teclado após o spacer ser aplicado.
   */
  private _findLowestVisibleButton(): HTMLElement | null {
    return (
      Array.from(document.querySelectorAll('ion-button')) as HTMLElement[]
    )
      .filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
      })
      .reduce<HTMLElement | null>((lowest, b) => {
        if (!lowest) return b;
        return b.getBoundingClientRect().bottom >
          lowest.getBoundingClientRect().bottom
          ? b
          : lowest;
      }, null);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Scroll fix — mantém o input focado visível acima do teclado
  // ═══════════════════════════════════════════════════════════════════════════

  private _initKeyboardScrollFix(): void {
    Keyboard.addListener('keyboardWillShow', (ev) => {
      this._keyboardHeight = ev.keyboardHeight ?? 0;
      this._keyboardAnimating = true;

      const el = this._resolveTargetElement();
      console.log('[KBD] scrollFix:willShow', {
        kbH: ev.keyboardHeight,
        activeTag: (document.activeElement as HTMLElement)?.tagName,
        activeId: (document.activeElement as HTMLElement)?.id,
        resolvedEl: el?.tagName,
        spacer: this._readSpacer(),
      });

      if (el) {
        window.setTimeout(() => {
          this._ensureFocusedElementVisible(el).catch(() => void 0);
        }, 50);
      }
    });

    // Teclado completamente aberto: iOS não fará mais auto-scroll.
    // Paramos o enforce loop para não bloquear o drag do usuário.
    Keyboard.addListener('keyboardDidShow', () => {
      this._keyboardVisible = true;
      this._keyboardAnimating = false;
    });

    Keyboard.addListener('keyboardWillHide', () => {
      this._keyboardHeight = 0;
      this._keyboardAnimating = false;
      this._pendingFocusEl = undefined;
      this._clampScrollTops(100, 200);
    });

    this._registerFocusListener();
  }

  /**
   * Resolve o elemento alvo do scroll: prefere o pendingFocusEl (cold tap),
   * com fallback ao activeElement atual (teclado reaberto sem blur).
   */
  private _resolveTargetElement(): HTMLElement | undefined {
    const pending = this._pendingFocusEl;
    this._pendingFocusEl = undefined;
    if (pending) return pending;

    const active = document.activeElement as HTMLElement | null;
    if (!active) return undefined;

    const path = active.shadowRoot ? [active] : [active];
    return (
      path.find(
        (n) =>
          n instanceof HTMLElement &&
          (n.tagName?.toLowerCase() === 'ion-item' ||
            n.tagName?.toLowerCase() === 'ion-input'),
      ) ??
      (['input', 'textarea'].includes(active.tagName?.toLowerCase())
        ? active
        : undefined)
    );
  }

  /**
   * Registra o listener global de `focusin` para capturar o elemento focado
   * e o scrollTop antes do iOS iniciar seu auto-scroll.
   */
  private _registerFocusListener(): void {
    this._focusListener = (e: Event): void => {
      const el = e.target as HTMLElement | null;
      if (!el) return;

      const tag = el.tagName?.toLowerCase();
      const isFocusable =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'ion-input' ||
        el.getAttribute('contenteditable') === 'true';
      if (!isFocusable) return;

      const path = e.composedPath() as HTMLElement[];

      const container =
        path.find(
          (node) =>
            node instanceof HTMLElement &&
            (node.tagName?.toLowerCase() === 'ion-item' ||
              node.tagName?.toLowerCase() === 'ion-input'),
        ) ?? el;

      // Captura scrollTop ANTES do WKWebView rolar automaticamente para o input.
      // `focusin` dispara antes de keyboardWillShow e antes do auto-scroll nativo.
      this._savedScrollTopOnFocus = this._readScrollTop(path);

      console.log('[KBD] focusin', {
        tag,
        containerTag: container.tagName,
        kbHeight: this._keyboardHeight,
        savedScrollTop: this._savedScrollTopOnFocus,
        spacer: this._readSpacer(),
        rectTop: el.getBoundingClientRect().top,
      });

      if (this._keyboardHeight === 0) {
        // Cold tap: teclado ainda fechado — aguarda keyboardWillShow para ter a
        // altura real do teclado antes de ajustar.
        this._pendingFocusEl = container;
        console.log('[KBD] focusin:coldTap (pending)');
        return;
      }

      // Teclado já aberto (troca de campo) → ajusta diretamente.
      console.log('[KBD] focusin:fieldSwitch (kbAlreadyOpen)');
      window.setTimeout(() => {
        this._ensureFocusedElementVisible(container).catch(() => void 0);
      }, 100);
    };

    window.addEventListener('focusin', this._focusListener, true);

    this._destroyRef.onDestroy(() => {
      if (this._focusListener) {
        window.removeEventListener('focusin', this._focusListener, true);
      }
      Keyboard.removeAllListeners().catch(() => void 0);
    });
  }

  /**
   * Lê o scrollTop do ion-content a partir do composedPath do evento de foco,
   * acessando o .inner-scroll no shadow DOM.
   */
  private _readScrollTop(path: HTMLElement[]): number | undefined {
    const ionContentEl = path.find(
      (node) =>
        node instanceof HTMLElement &&
        node.tagName?.toLowerCase() === 'ion-content',
    ) as HTMLElement | undefined;

    return (
      ionContentEl?.shadowRoot?.querySelector(
        '.inner-scroll',
      ) as HTMLElement | null
    )?.scrollTop;
  }

  /**
   * Faz o clamp do scrollTop de todos os ion-contents após o teclado fechar.
   * Necessário em Android (adjustResize): o WebView volta ao tamanho original
   * e o maxScrollTop cai para 0, mas o scrollTop programático permanece.
   */
  private _clampScrollTops(delay: number, animDuration: number): void {
    window.setTimeout(() => {
      const contents = document.querySelectorAll('ion-content');
      contents.forEach(async (c: SafeAny) => {
        if (!c?.getScrollElement || !c?.scrollToPoint) return;
        const scrollEl: HTMLElement = await c.getScrollElement();
        const maxTop = Math.max(
          0,
          scrollEl.scrollHeight - scrollEl.clientHeight,
        );
        if (scrollEl.scrollTop > maxTop) {
          c.scrollToPoint(0, maxTop, animDuration);
        }
      });
    }, delay);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Ensure focused element visible
  // ═══════════════════════════════════════════════════════════════════════════

  private async _ensureFocusedElementVisible(el: HTMLElement): Promise<void> {
    const ionContent = el.closest('ion-content') as SafeAny;
    if (!ionContent?.getScrollElement || !ionContent?.scrollByPoint) return;

    const scrollEl: HTMLElement = await ionContent.getScrollElement();

    const savedTop = this._savedScrollTopOnFocus;
    const isIos = Capacitor.getPlatform() === 'ios';
    const hasSavedTop = isIos && typeof savedTop === 'number';

    // Desfaz o auto-scroll do WKWebView antes de medir qualquer posição.
    // Não usamos await/rAF aqui: ceder para o event loop abre janela para o
    // iOS rolar novamente, invalidando as medições subsequentes.
    if (hasSavedTop) {
      this._restoreScrollIfDrifted(scrollEl, savedTop as number);
    }

    const rect = el.getBoundingClientRect();
    const ionHeader = this._findVisibleIonHeader(el);
    const minTop =
      (ionHeader?.getBoundingClientRect().bottom ?? 0) + this._MARGIN;
    const visibleBottom =
      window.innerHeight - (this._keyboardHeight || 0) - this._MARGIN;
    const maxScroll = Math.max(0, rect.top - minTop);

    // Usa o botão mais baixo para que o scroll inicial já cubra todos os botões
    // visíveis (ex.: botão secundário abaixo do submit em login.page).
    const submitBtn =
      this._findLowestVisibleButton() ??
      this._findSubmitButtonInContent(ionContent);
    const delta = this._calculateScrollDelta(
      rect,
      visibleBottom,
      maxScroll,
      submitBtn,
    );

    console.log('[KBD] ensureVisible', {
      elTag: el.tagName,
      rectTop: rect.top,
      rectBottom: rect.bottom,
      visibleBottom,
      minTop,
      maxScroll,
      delta,
      scrollTop: scrollEl.scrollTop,
      maxScrollTop: Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight),
      submitBtnBottom: submitBtn?.getBoundingClientRect().bottom,
      spacer: this._readSpacer(),
    });

    let scrollDuration = 0;
    if (delta > 0) {
      console.log('[KBD] ensureVisible:scrollByPoint', { delta });
      ionContent.scrollByPoint(0, delta, 300);
      scrollDuration = 300;
    } else if (rect.top < this._MARGIN) {
      console.log('[KBD] ensureVisible:overscrollFix', { rectTop: rect.top });
      ionContent.scrollByPoint(0, rect.top - this._MARGIN, 200);
    } else if (hasSavedTop) {
      console.log('[KBD] ensureVisible:enforceLoop', { savedTop });
      this._startEnforceLoop(scrollEl, savedTop as number);
    }

    if (isIos) {
      this._schedulePositionChecks(el, ionContent, minTop, scrollDuration);
    }

    if (isIos && submitBtn) {
      window.setTimeout(() => {
        this._trimKeyboardSpacer(scrollEl, submitBtn, ionContent, el);
      }, scrollDuration + 50);
    }
  }

  /**
   * Restaura o scrollTop ao valor salvo em `focusin` se o WKWebView o tiver
   * alterado durante o intervalo entre o foco e a execução deste método.
   */
  private _restoreScrollIfDrifted(
    scrollEl: HTMLElement,
    savedTop: number,
  ): void {
    if (Math.abs(scrollEl.scrollTop - savedTop) > 1) {
      scrollEl.scrollTop = savedTop;
    }
  }

  /**
   * Encontra o ion-header visível na tela (bottom > 10px) percorrendo primeiro
   * a ion-page mais próxima e depois o documento inteiro.
   *
   * Não usamos apenas closest('ion-page').querySelector('ion-header') porque
   * headers dentro de componentes wrapper (ex.: ft-header) retornam
   * getBoundingClientRect().bottom = 0 e seriam ignorados incorretamente.
   */
  private _findVisibleIonHeader(el: HTMLElement): HTMLElement | null {
    const ionPage = el.closest('ion-page') as HTMLElement | null;
    const inPage = ionPage
      ? (Array.from(ionPage.querySelectorAll('ion-header')) as HTMLElement[])
      : [];
    const inDoc = Array.from(
      document.querySelectorAll('ion-header'),
    ) as HTMLElement[];

    return (
      [...inPage, ...inDoc].find(
        (h) => h.getBoundingClientRect().bottom > 10,
      ) ?? null
    );
  }

  /**
   * Retorna o ion-button[type="submit"] dentro do ion-content,
   * ou o último ion-button como fallback.
   */
  private _findSubmitButtonInContent(
    ionContent: HTMLElement,
  ): HTMLElement | null {
    return (
      (ionContent.querySelector(
        'ion-button[type="submit"]',
      ) as HTMLElement | null) ??
      (Array.from(
        ionContent.querySelectorAll('ion-button'),
      ).pop() as HTMLElement | null)
    );
  }

  /**
   * Calcula quantos pixels o conteúdo deve ser scrollado para que o input
   * focado e o botão submit fiquem visíveis acima do teclado.
   *
   * Regras:
   *  1. Input oculto (inputDelta > 0): scroll para revelar input e botão,
   *     respeitando maxScroll para não empurrar o input atrás do header.
   *  2. Input visível, botão oculto, espaço suficiente (≥ _MIN_SCROLL_ROOM):
   *     scroll apenas o necessário para o botão, até maxScroll.
   *  3. Input visível perto do topo (< _MIN_SCROLL_ROOM): não scrolla — o input
   *     ficaria atrás do header. O spacer CSS resolve a posição do botão.
   */
  private _calculateScrollDelta(
    rect: DOMRect,
    visibleBottom: number,
    maxScroll: number,
    submitBtn: HTMLElement | null,
  ): number {
    const elBottom = rect.bottom + this._HINT_RESERVE;
    const inputDelta = Math.max(0, elBottom - visibleBottom);

    let buttonDelta = 0;
    if (submitBtn) {
      buttonDelta = Math.max(
        0,
        submitBtn.getBoundingClientRect().bottom - visibleBottom,
      );
    }

    if (inputDelta > 0) {
      return Math.min(Math.max(inputDelta, buttonDelta), maxScroll);
    }
    if (buttonDelta > 0 && maxScroll >= this._MIN_SCROLL_ROOM) {
      return Math.min(buttonDelta, maxScroll);
    }
    return 0;
  }

  /**
   * Loop rAF que mantém o scrollTop fixo em `target` durante a animação de
   * abertura do teclado, impedindo o auto-scroll do WKWebView.
   * Para automaticamente em keyboardDidShow (_keyboardAnimating = false),
   * liberando o scroll manual do usuário.
   */
  private _startEnforceLoop(scrollEl: HTMLElement, target: number): void {
    let frameCount = 0;
    let correctionCount = 0;
    console.log('[KBD] enforceLoop:start', { target });
    const enforce = (): void => {
      frameCount++;
      if (!this._keyboardAnimating) {
        console.log('[KBD] enforceLoop:stop', {
          frames: frameCount,
          corrections: correctionCount,
          reason: 'keyboardAnimating=false',
        });
        return;
      }
      if (Math.abs(scrollEl.scrollTop - target) > 2) {
        correctionCount++;
        console.log('[KBD] enforceLoop:correct', {
          from: Math.round(scrollEl.scrollTop),
          to: target,
          correction: correctionCount,
        });
        scrollEl.scrollTop = target;
      }
      requestAnimationFrame(enforce);
    };
    requestAnimationFrame(enforce);
  }

  /**
   * Agenda checkpoints de correção de posição após o scroll estabilizar.
   * Cobre casos em que o iOS re-scrolla depois do enforce loop encerrar.
   *
   * Ajuste os delays se o dispositivo apresentar re-scrolls tardios.
   */
  private _schedulePositionChecks(
    el: HTMLElement,
    ionContent: SafeAny,
    minTop: number,
    scrollDuration: number,
  ): void {
    const check = (delay: number): void => {
      window.setTimeout(() => {
        const top = el.getBoundingClientRect().top;
        console.log('[KBD] positionCheck', {
          delay,
          top: Math.round(top),
          minTop: Math.round(minTop),
          wouldScroll: top < minTop - 4,
        });
        if (top < minTop - 4) {
          ionContent.scrollByPoint(0, top - minTop, 150);
        }
      }, delay);
    };

    check(scrollDuration + 450);
    check(scrollDuration + 800);
    check(scrollDuration + 1200);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Trim spacer — ajusta o --keyboard-safe-area após o scroll estabilizar
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Reduz o --keyboard-safe-area até o botão assentar logo acima do teclado,
   * eliminando espaço em branco residual após o scroll.
   *
   * Estratégia baseada em getBoundingClientRect (não em scroll residual):
   *  - gap > 0  → botão está acima do alvo (espaço vazio abaixo) → reduz spacer
   *  - gap ≤ 0  → botão no alvo ou abaixo → sem alteração
   */
  private _trimKeyboardSpacer(
    scrollEl: HTMLElement,
    submitBtn: HTMLElement,
    ionContent: SafeAny,
    focusedEl?: HTMLElement,
  ): void {
    const targetBtnBottom =
      window.innerHeight - (this._keyboardHeight || 0) - this._MARGIN;
    const kbTop = window.innerHeight - (this._keyboardHeight || 0);
    // Usa o botão mais baixo para não cortar o spacer além do necessário.
    // Se usar só o submit (primário), o trim derruba o secundário atrás do teclado.
    const lowestBtn = this._findLowestVisibleButton() ?? submitBtn;
    const currentBtnBottom = lowestBtn.getBoundingClientRect().bottom;

    console.log('[KBD] trim:enter', {
      targetBtnBottom,
      kbTop,
      currentBtnBottom,
      spacer: this._readSpacer(),
      scrollTop: scrollEl.scrollTop,
      maxScrollTop: Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight),
    });

    if (currentBtnBottom > kbTop) {
      // Botão ainda atrás do teclado: tenta trazê-lo via scroll complementar.
      console.log('[KBD] trim:btnBehindKb → scrollIntoView');
      this._scrollButtonIntoView(
        scrollEl,
        ionContent,
        focusedEl,
        currentBtnBottom,
        targetBtnBottom,
      );
      return;
    }

    const currentSpacer =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--keyboard-safe-area',
        ),
      ) || 0;
    if (currentSpacer <= 0) {
      console.log('[KBD] trim:skip (spacer<=0)');
      return;
    }

    const gap = targetBtnBottom - currentBtnBottom;
    const maxScrollTop = Math.max(
      0,
      scrollEl.scrollHeight - scrollEl.clientHeight,
    );
    const extraScrollable = maxScrollTop - scrollEl.scrollTop;

    this._reduceExcessSpacer(
      gap,
      extraScrollable,
      currentSpacer,
      scrollEl.scrollTop,
    );
  }

  /**
   * Tenta scrollar o botão para cima do teclado quando o scroll inicial
   * foi insuficiente ou cancelado pelo iOS.
   * Respeita _MIN_SCROLL_ROOM para não empurrar o input focado atrás do header.
   */
  private _scrollButtonIntoView(
    scrollEl: HTMLElement,
    ionContent: SafeAny,
    focusedEl: HTMLElement | undefined,
    currentBtnBottom: number,
    targetBtnBottom: number,
  ): void {
    const extraDelta = currentBtnBottom - targetBtnBottom;
    const maxScrollTop = Math.max(
      0,
      scrollEl.scrollHeight - scrollEl.clientHeight,
    );
    let safeExtra = Math.min(extraDelta, maxScrollTop - scrollEl.scrollTop);

    if (focusedEl) {
      const ionHeader = this._findVisibleIonHeader(focusedEl);
      const minTop =
        (ionHeader?.getBoundingClientRect().bottom ?? 0) + this._MARGIN;
      const inputMaxScroll = Math.max(
        0,
        focusedEl.getBoundingClientRect().top - minTop,
      );
      // Input próximo ao topo: scroll complementar o empurraria atrás do header.
      if (inputMaxScroll < this._MIN_SCROLL_ROOM) {
        console.log('[KBD] scrollBtnIntoView:abort (input near top)', {
          inputMaxScroll,
          MIN: this._MIN_SCROLL_ROOM,
        });
        return;
      }
      safeExtra = Math.min(safeExtra, inputMaxScroll);
    }

    console.log('[KBD] scrollBtnIntoView', {
      extraDelta,
      maxScrollTop,
      scrollTop: scrollEl.scrollTop,
      safeExtra,
    });

    if (safeExtra > 0) {
      ionContent.scrollByPoint(0, safeExtra, 150);
    }
  }

  /**
   * Reduz o spacer pelo gap necessário para o botão assentar no alvo,
   * ou pelo excesso de conteúdo rolável abaixo do scrollTop atual.
   *
   * Após a redução, agenda clamps para garantir que scrollTop não ultrapasse
   * o novo maxScrollTop.
   *
   * IMPORTANTE: a poda por `extraScrollable` SÓ é aplicada quando houve scroll
   * efetivo (scrollTop > 0). Em layouts curtos onde o input já está visível
   * sem precisar rolar (ex.: AcessoLayout — `.topo` empurra o `.body` para
   * baixo, mas Tel/Senha ainda cabem acima do teclado), o `maxScrollTop` é
   * inflado pelo próprio spacer e `extraScrollable` reflete o tamanho do
   * spacer, não excesso de scroll. Trim nesse caso derrubaria o botão; iOS
   * reemitiria `keyboardWillShow` na troca de campo e o botão voltaria a
   * subir → efeito de "bounce" relatado em login.page.
   */
  private _reduceExcessSpacer(
    gap: number,
    extraScrollable: number,
    currentSpacer: number,
    scrollTop: number,
  ): void {
    // Ajuste SCROLL_BUFFER se o conteúdo ficar "preso" após o trim em alguns devices.
    const SCROLL_BUFFER = 8;
    const BUFFER = 4;

    let spacerCut = 0;
    let reason = 'noop';
    if (gap > BUFFER) {
      // Botão alto demais: desce exatamente pelo gap.
      spacerCut = gap;
      reason = 'gap>BUFFER';
    } else if (scrollTop > 0) {
      // Houve scroll real: removemos o excesso de room remanescente.
      spacerCut = Math.max(0, extraScrollable - SCROLL_BUFFER);
      reason = 'extraScrollable';
    }
    // else: input já estava visível (sem scroll). `extraScrollable` é apenas
    // o spacer fazendo seu trabalho — não tocar.

    console.log('[KBD] reduceExcessSpacer', {
      gap,
      extraScrollable,
      currentSpacer,
      scrollTop,
      reason,
      spacerCut,
      newSpacer: Math.max(0, currentSpacer - spacerCut),
    });

    if (spacerCut <= 0) return;

    document.documentElement.style.setProperty(
      '--keyboard-safe-area',
      `${Math.max(0, currentSpacer - spacerCut)}px`,
    );

    this._scheduleScrollClamp();
  }

  /**
   * Agenda verificações pós-trim para garantir que o scrollTop não ultrapasse
   * o novo maxScrollTop após a redução do spacer.
   */
  private _scheduleScrollClamp(): void {
    // Monitora em múltiplos pontos para cobrir refluxos tardios do layout.
    [0, 200, 500, 1000].forEach((delay) => {
      window.setTimeout(() => {
        const contents = document.querySelectorAll('ion-content');
        contents.forEach(async (c: SafeAny) => {
          if (!c?.getScrollElement || !c?.scrollToPoint) return;
          const scrollEl: HTMLElement = await c.getScrollElement();
          const maxTop = Math.max(
            0,
            scrollEl.scrollHeight - scrollEl.clientHeight,
          );
          if (scrollEl.scrollTop > maxTop) {
            console.log('[KBD] scrollClamp', {
              delay,
              before: scrollEl.scrollTop,
              maxTop,
            });
            c.scrollToPoint(0, maxTop, 0);
          }
        });
      }, delay);
    });
  }
}
