'use client';

import { usePathname } from 'next/navigation.js';
import type { ReactNode } from 'react';
import { messages } from '../i18n/messages.js';

type NavKey = keyof typeof messages.shell.items;

type NavItem =
  | { readonly kind: 'link'; readonly key: NavKey; readonly href: '/'; readonly icon: string }
  | { readonly kind: 'soon'; readonly key: NavKey; readonly icon: string };

const navItems: readonly NavItem[] = [
  { kind: 'link', key: 'home', href: '/', icon: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z' },
  { kind: 'soon', key: 'passport', icon: 'M4 5h16v14H4zM8 9.5h4M8 13h8M8 16h5' },
  {
    kind: 'soon',
    key: 'xpCalculator',
    icon: 'M6 3h12v18H6zM9 7h6M9 11h1M14 11h1M9 15h1M14 15h1',
  },
];

function Icon({ d }: { readonly d: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-6 shrink-0 fill-none stroke-current stroke-[1.5]"
    >
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Abaixo de 768px a label fica por baixo do ícone; no rail de 64px só o ícone
// (label para leitores de ecrã); a partir de 1200px, rail de 240px com label.
const itemClass =
  'flex flex-1 flex-col items-center gap-1 rounded-md px-2 py-2 text-xs md:flex-none md:justify-center md:py-3 xl:flex-row xl:justify-start xl:gap-3 xl:px-3 xl:text-sm';
const labelClass = 'md:sr-only xl:not-sr-only';

export function AppShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const { shell, app } = messages;

  return (
    <>
      <a
        href="#content"
        className="sr-only rounded-md bg-primary px-4 py-2 font-semibold text-void focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-20"
      >
        {shell.skipToContent}
      </a>
      <nav
        aria-label={shell.navLabel}
        className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-surface-1 md:inset-y-0 md:right-auto md:w-16 md:border-t-0 md:border-r xl:w-60"
      >
        <p className="hidden px-6 pt-6 pb-4 font-mono text-sm font-semibold tracking-wider text-primary uppercase xl:block">
          {app.name}
        </p>
        <ul className="flex px-2 md:flex-col md:gap-1 md:pt-4 xl:pt-0">
          {navItems.map((item) => {
            const label = shell.items[item.key];
            if (item.kind === 'soon') {
              return (
                <li key={item.key} className="flex flex-1 md:flex-none">
                  <span className={`${itemClass} text-text-muted`}>
                    <Icon d={item.icon} />
                    <span className={labelClass}>{label}</span>
                    <span className="sr-only rounded-sm bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase xl:not-sr-only xl:ml-auto">
                      {shell.soon}
                    </span>
                  </span>
                </li>
              );
            }
            const current = pathname === item.href;
            return (
              <li key={item.key} className="flex flex-1 md:flex-none">
                <a
                  href={item.href}
                  aria-current={current ? 'page' : undefined}
                  className={`${itemClass} motion-safe:transition-colors ${
                    current ? 'bg-surface-3 text-primary' : 'text-text hover:bg-surface-2'
                  }`}
                >
                  <Icon d={item.icon} />
                  <span className={labelClass}>{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <main id="content" className="min-h-screen pb-20 md:pb-0 md:pl-16 xl:pl-60">
        {children}
      </main>
    </>
  );
}
