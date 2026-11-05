// Avatar com iniciais (WI-0008, ADR 0008): as fotos da CDN da 42 deixaram de
// ser acessíveis. Funções puras sobre o login e a cor de destaque.

/** Iniciais do login: 1.ª letra e, se houver hífen, a 1.ª depois dele. */
export function initialsFromLogin(login: string): string {
  const [first = '', ...rest] = login.split('-');
  const second = rest.find((part) => part.length > 0) ?? '';
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

/** Luminância relativa da WCAG 2.x de uma cor #RGB ou #RRGGBB. */
function luminance(hex: string): number {
  const digits = hex.slice(1);
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((d) => d + d)
          .join('')
      : digits;
  const channel = (at: number): number => {
    const c = parseInt(full.slice(at, at + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/**
 * Cores do círculo: fundo = cor de destaque; texto = preto ou branco puro, o
 * que tiver mais contraste. Uma das duas dá sempre pelo menos 4.58:1 (AC2).
 */
export function avatarColors(background: string): {
  background: string;
  text: '#000000' | '#FFFFFF';
} {
  const l = luminance(background);
  const withBlack = (l + 0.05) / 0.05;
  const withWhite = 1.05 / (l + 0.05);
  return { background, text: withBlack >= withWhite ? '#000000' : '#FFFFFF' };
}
