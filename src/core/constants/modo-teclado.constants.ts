export enum ModoTecladoEnum {
  SERVICO = 'servico',
  CAPACITOR = 'capacitor',
}

export const ROTA_FORM_SERVICO = 'form-servico';
export const ROTA_FORM_CAPACITOR = 'form-capacitor';

/**
 * O modo e definido pela URL no carregamento da pagina (antes do bootstrap), porque o
 * KeyboardScrollService registra listeners globais que nunca sao removidos: cada modo precisa
 * de um carregamento completo para rodar sem interferencia do outro.
 */
export const getModoTecladoAtual = (): ModoTecladoEnum =>
  window.location.pathname.includes(ROTA_FORM_CAPACITOR)
    ? ModoTecladoEnum.CAPACITOR
    : ModoTecladoEnum.SERVICO;
