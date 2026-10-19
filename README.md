# Teclado Lab

Versão mínima e limpa do e-commerce para investigar por que o nosso gerenciamento de teclado
(`KeyboardScrollService`) não funciona bem no iOS. Mesmas versões e mesmo caminho de build do e-commerce,
sem Firebase, push, edge-to-edge, swiper, splash manual, i18n nem backend.

## Telas

| Rota | Tratamento do teclado |
|---|---|
| `/home` | Dois botões. Cada um recarrega o app no modo escolhido. |
| `/form-servico` | **Nosso serviço**: `KeyboardScrollService` (cópia literal do e-commerce) com `KeyboardResize.None`, spacer `--keyboard-safe-area` e scroll manual. `scrollAssist`/`scrollPadding` do Ionic **desligados** (igual ao `main.ts` do e-commerce). |
| `/form-capacitor` | **Capacitor/Ionic**: `Keyboard.setResizeMode(Native)` em runtime e `scrollAssist`/`scrollPadding` do Ionic **ligados**. O serviço não é iniciado. |

As duas telas usam o **mesmo** componente de formulário (`FormularioExemploComponent`, 10 campos + botão no rodape
via `app-layout-rounded-button-footer`, mesmo mixin `ft-keyboard-spacer` do e-commerce). Só muda o teclado.

### Por que cada tela recarrega o app

O `KeyboardScrollService.init()` registra listeners globais (`focusin`, `keyboardWillShow`, ...) que só são removidos
no `DestroyRef` de um service `root`, ou seja, nunca. Para a tela "Capacitor" rodar sem interferência, o modo é decidido
pela URL **antes do bootstrap** (`getModoTecladoAtual()` em `src/core/constants/modo-teclado.constants.ts`), por isso os
botões da home fazem `window.location.assign(...)`. O voltar do header volta para a home sem recarregar, mas a home
sempre recarrega ao escolher um modo.

### Barra de diagnóstico

O `app-debug-viewport` mostra no topo `innerH`, `vvH` (visualViewport), `kbd` (`--keyboard-safe-area`) e `scrollTop`
do `ion-content` visível. Para desligar, `EXIBIR_DEBUG_VIEWPORT = false` em
`src/core/components/debug-viewport/debug-viewport.component.ts`. O serviço também loga `[KBD] ...` no console
(Web Inspector do Safari).

## Build iOS (num Mac)

Pré-requisitos: Node **22.13.0** (exato, ver `engines`), Xcode, e no Xcode um time de signing.

```bash
npm ci
npm run buildSynciOS
```

`buildSynciOS` é o mesmo encadeamento de `buildSynciOS:dev` do e-commerce:

1. `ng build --configuration=development` (gera `www/`)
2. `node scripts/preparar-ios.js` — roda `npx cap add ios` **só se `ios/` não existir** (primeira vez)
3. `node scripts/configure-ios-info-plist.js` — deixa só orientação retrato (cópia do e-commerce)
4. `npx cap copy ios` + `npx cap sync ios`
5. `npx cap open ios` — abre o Xcode

No Xcode: selecione o target `App`, em *Signing & Capabilities* escolha o time (o `appId` é
`br.com.formaturismo.TecladoLab`, diferente do app real para coexistir no aparelho) e rode num iPhone físico
(o teclado do simulador não reproduz tudo). Para inspecionar: Safari > Desenvolver > [aparelho] > Teclado Lab.

`ios/` e `android/` estão no `.gitignore` (igual ao e-commerce) e são gerados pelo Capacitor.

> Nesta máquina (Windows) só foi possível validar `tsc`, `ng build` e o fluxo no navegador. O build iOS, o `cap add ios` e
> o comportamento real do teclado **não foram testados**.

## O que foi mantido do e-commerce

- Versões: Angular 19.2, `@ionic/angular` 8.8, Capacitor 8.5, `@capacitor/keyboard` 8, TypeScript 5.6, zone.js 0.15, builder `browser`.
- `capacitor.config.ts`: `Keyboard { resize: None, resizeOnFullScreen: false }`, `StatusBar { overlaysWebView: false }`.
- `provideIonicAngular({ mode: 'md', ... })` (modo `md` também no iOS), `IonicRouteStrategy`.
- `index.html`: viewport (`viewport-fit=cover`, `maximum-scale=1`, `user-scalable=no`).
- Classe `ios` no `body` e as regras `.ios ion-content { ... }` de `_ionic-core.scss`.
- `ion-content [fullscreen]="true" class="layout-rounded-button-footer"` com o miolo `ft-layout-rounded-button-footer`
  (botão com `margin-top: auto` no fim do fluxo + `::after` com `--keyboard-safe-area`, sem `ion-footer`).

## Tabela de bisseção

Se o serviço funcionar no lab e não no e-commerce, reintroduza as peças abaixo **uma de cada vez** (na ordem) e teste de novo:

| # | Peça do e-commerce | Onde está no e-commerce |
|---|---|---|
| 1 | `ScreenOrientation.lock('portrait')` | `app.component.ts` (`_initializeApp`) |
| 2 | `StatusBar.setBackgroundColor`/`show` e cor do `EdgeToEdge` | `app.component.ts`, `capacitor.config.ts` |
| 3 | `SplashScreen` com `launchAutoHide: false` + animação de splash manual | `capacitor.config.ts`, `app.component.ts` (`ngOnInit`) |
| 4 | `ftIosTransitionAnimation` no `ion-router-outlet` | `app.component.html`, skill `ios-comportamento` |
| 5 | `ft-header` (em vez do `ion-header` simples) | `src/core/components/header` |
| 6 | `ft-input` completo (máscara Maskito, sanitização, hints) | `src/core/components/input*` |
| 7 | `ion-tabs`, menu lateral e rotas embarcadas na home | `app.component.html`, skill `header-navegacao-web-mobile` |
| 8 | `ft-acesso-layout` / `ft-content-rounded` no lugar do footer | `src/core/components/*-layout`, `content-rounded` |
| 9 | Firebase Messaging, Push Notifications e Local Notifications | `app.component.ts`, `NotificacoesPushService` |
| 10 | `registerSwiperElements()` + `__Zone_disable_customElements` | `main.ts`, `polyfills.ts` |
| 11 | `APP_INITIALIZER`s (translate, configuração regional, luxon) e interceptors | `main.ts` |
| 12 | `PreloadAllModules` e rotas protegidas por guards | `main.ts`, `*.routes.ts` |
| 13 | Tema `theme-forma` completo + `_inputs.scss`/`_layout.scss`/`_buttons.scss` | `src/theme/global/*` |

Pontos do serviço que valem atenção ao testar:

- Spacer, animação e `_trimKeyboardSpacer` só rodam no iOS; no Android só há `scrollByPoint`.
- `_findLowestVisibleButton` considera qualquer `ion-button` visível: um botão fora do footer distorce o cálculo.
- `ft-content-rounded` não aplica o spacer; só o `ft-layout-rounded-button-footer` e o `ft-acesso-layout`.
