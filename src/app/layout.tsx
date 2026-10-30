import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '../components/app-shell.js';
import { messages } from '../i18n/messages.js';
import { cssVariables } from '../theme/tokens.js';

export const metadata: Metadata = {
  title: messages.app.name,
  description: messages.app.description,
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{cssVariables()}</style>
      </head>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
