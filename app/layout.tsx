import type { Metadata, Viewport } from 'next';
import { Noto_Nastaliq_Urdu, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/store';
import { LocaleShell } from '@/components/LocaleShell';
import { ToastProvider } from '@/components/Toast';

const ui = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});

// Urdu is read in Nastaliq. Only a handful of weights exist, and the face is
// large, so it is loaded as a separate variable rather than applied globally.
const urdu = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  variable: '--font-urdu-face',
  weight: ['400', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Family Tree',
  description: 'Build and keep your family tree. Works in English and Urdu.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#17624f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang and dir are set on the client by <LocaleShell> once the saved
  // language is known; these are the sensible pre-hydration defaults.
  return (
    <html lang="en" dir="ltr" className={`${ui.variable} ${urdu.variable}`}>
      {/* Browser extensions commonly add attributes to <body> before React
          hydrates (e.g. style="isolation:isolate"), which React reports as a
          mismatch. Nothing here renders a body style, so the warning is noise. */}
      <body className="antialiased" suppressHydrationWarning>
        <AppProvider>
          <ToastProvider>
            <LocaleShell>{children}</LocaleShell>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
