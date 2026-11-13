import './globals.css';

export const metadata = {
  title: 'Open Higgsfield AI — Local Studio',
  description: 'Local AI creative studio powered by MiniMax H3 and Wan2GP.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/google-sans-400.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/google-sans-500.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/google-sans-600.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/google-sans-700.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
