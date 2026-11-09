import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { getSession } from '../auth/handlers';
import { AppShell } from '../components/app-shell';
import { messages } from '../i18n/messages';
import { authDeps } from '../server/runtime';
import { cssVariables } from '../theme/tokens';

export const metadata: Metadata = {
  title: messages.app.name,
  description: messages.app.description,
};

export default async function RootLayout({ children }: { readonly children: ReactNode }) {
  // Public pages work without server configuration, so only pass an identity when
  // the authenticated session can be resolved.
  let userId: string | undefined;
  try {
    const cookie = (await headers()).get('cookie') ?? '';
    const session = await getSession(
      new Request('http://app.internal/', { headers: { cookie } }),
      await authDeps()
    );
    userId = session?.userId;
  } catch {
    // Protected pages resolve the session again and surface their own auth errors.
  }

  return (
    <html lang="en">
      <head>
        <style>{cssVariables()}</style>
      </head>
      <body className="font-sans antialiased">
        <AppShell userId={userId}>{children}</AppShell>
      </body>
    </html>
  );
}
