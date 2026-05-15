import './globals.css';

export const metadata = {
  title: 'Fugth Management',
  description: 'AI That Sounds Like a Human',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}