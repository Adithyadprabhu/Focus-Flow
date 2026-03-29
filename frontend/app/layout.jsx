import './globals.css';

export const metadata = {
  title: 'Focus-Flow | The Fluid Academy',
  description: 'AI-powered learning platform for students and teachers',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Critical fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#3525cd" />
      </head>
      <body className="min-h-screen flex flex-col font-body bg-surface text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}
