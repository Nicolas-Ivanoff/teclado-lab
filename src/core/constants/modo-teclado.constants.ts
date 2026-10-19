import { KeyboardResize } from '@capacitor/keyboard';

export enum ModoTecladoEnum {
  SERVICO = 'servico',
  NONE = 'none',
  BODY = 'body',
  IONIC = 'ionic',
  NATIVE = 'native',
}

export const ROTA_FORM_SERVICO = 'form-servico';
export const ROTA_FORM_NONE = 'form-none';
export const ROTA_FORM_BODY = 'form-body';
export const ROTA_FORM_IONIC = 'form-ionic';
export const ROTA_FORM_NATIVE = 'form-native';

export const ROTA_POR_MODO: Record<ModoTecladoEnum, string> = {
  [ModoTecladoEnum.SERVICO]: ROTA_FORM_SERVICO,
  [ModoTecladoEnum.NONE]: ROTA_FORM_NONE,
  [ModoTecladoEnum.BODY]: ROTA_FORM_BODY,
  [ModoTecladoEnum.IONIC]: ROTA_FORM_IONIC,
  [ModoTecladoEnum.NATIVE]: ROTA_FORM_NATIVE,
};

/** KeyboardResize de cada modo. No modo servico o proprio servico define None no init(). */
export const RESIZE_POR_MODO: Record<ModoTecladoEnum, KeyboardResize> = {
  [ModoTecladoEnum.SERVICO]: KeyboardResize.None,
  [ModoTecladoEnum.NONE]: KeyboardResize.None,
  [ModoTecladoEnum.BODY]: KeyboardResize.Body,
  [ModoTecladoEnum.IONIC]: KeyboardResize.Ionic,
  [ModoTecladoEnum.NATIVE]: KeyboardResize.Native,
};

/**
 * O modo e definido pela URL no carregamento da pagina (antes do bootstrap), porque o
 * KeyboardScrollService registra listeners globais que nunca sao removidos e o scrollAssist do
 * Ionic e lido uma unica vez no boot: cada modo precisa de um carregamento completo.
 */
export const getModoTecladoAtual = (): ModoTecladoEnum => {
  const caminho = window.location.pathname;
  const modoEncontrado = Object.values(ModoTecladoEnum).find(
    (modo) => caminho.includes(ROTA_POR_MODO[modo]),
  );
  return modoEncontrado ?? ModoTecladoEnum.SERVICO;
};

export const ehModoServico = (modo: ModoTecladoEnum): boolean =>
  modo === ModoTecladoEnum.SERVICO;
