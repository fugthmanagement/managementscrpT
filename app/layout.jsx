import './globals.css';

export const metadata = {
  metadataBase: new URL("https://www.fugthmanagement.space"),
  title: "Fugth Management | Make Every Hello Count",
  description: "An AI receptionist and connected business command center to help service businesses answer calls, capture leads, and organize their next steps.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Fugth Management — Make Every Hello Count",
    description: "Give every incoming customer a better hello with voice AI and one connected business workspace.",
    url: "https://www.fugthmanagement.space",
    siteName: "Fugth Management", type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script type="text/javascript" dangerouslySetInnerHTML={{
          __html: `
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "wrplhq4o8q");
          `
        }} />
      </head>
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}