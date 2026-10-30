// Tokens de cor do Cyber Duck (docs/canonical/design.md). Fonte única: o CSS
// recebe-os como variáveis (`cssVariables`) e o Tailwind aponta para elas.

type Hex = `#${string}`;

export const colors = {
  void: '#080B0F',
  voidInset: '#0D1117',
  surface1: '#12161E',
  surface2: '#161B22',
  surface3: '#21262D',
  text: '#E6EDF3',
  textMuted: '#8B949E',
  primary: '#00BABC',
  duck: '#FFC700',
  alumni: '#A855F7',
  cyan: '#00F0FF',
  danger: '#F85149',
} as const satisfies Record<string, Hex>;

type ColorToken = keyof typeof colors;

const allSurfaces = ['void', 'voidInset', 'surface1', 'surface2', 'surface3'] as const;

// Que texto pode ir sobre que superfície. O alumni (#A855F7) fica abaixo de
// 4.5:1 em surface-2 e surface-3: aí só serve para preenchimento ou borda.
const textOn: readonly (readonly [text: ColorToken, surfaces: readonly ColorToken[]])[] = [
  ['text', allSurfaces],
  ['textMuted', allSurfaces],
  ['primary', allSurfaces],
  ['duck', allSurfaces],
  ['cyan', allSurfaces],
  ['danger', allSurfaces],
  ['alumni', ['void', 'voidInset', 'surface1']],
  // Texto de botões cheios (primary, duck).
  ['void', ['primary', 'duck']],
];

export interface TextSurfacePair {
  readonly text: Hex;
  readonly surface: Hex;
}

export const textSurfacePairs: readonly TextSurfacePair[] = textOn.flatMap(([text, surfaces]) =>
  surfaces.map((surface) => ({ text: colors[text], surface: colors[surface] }))
);

const kebab = (name: string): string => name.replace(/[A-Z0-9]+/g, (m) => `-${m.toLowerCase()}`);

export const cssVariables = (): string =>
  `:root{${Object.entries(colors)
    .map(([name, value]) => `--dh-${kebab(name)}:${value};`)
    .join('')}}`;
