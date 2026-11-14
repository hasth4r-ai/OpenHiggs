import './globals.css';

export const metadata = {
  title: 'Local AI Studio',
  description: 'Local AI creative studio powered by MiniMax H3 and Wan2GP.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-[#09090b] text-white">{children}</body>
    </html>
  );
}
