import './globals.css';

export const metadata = {
  title: 'OpenHiggs',
  description: 'Self-hosted open-source AI video, inpainting, and cinema studio.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-[#09090b] text-white">{children}</body>
    </html>
  );
}
