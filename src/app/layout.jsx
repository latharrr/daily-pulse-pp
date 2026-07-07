import './globals.css';

export const metadata = {
  title: 'Daily Pulse',
  description: 'Know what your team is doing',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body
        className="min-h-full bg-[#09090b] text-zinc-50"
        style={{
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
