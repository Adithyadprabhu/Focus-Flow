import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta' });

export const metadata = {
  title: 'Focus-Flow | The Fluid Academy',
  description: 'AI-powered learning platform for students and teachers',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <head>
        {/* Material Symbols */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#3525cd" />
      </head>
      <body className="min-h-screen flex flex-col font-body bg-surface text-on-surface antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
