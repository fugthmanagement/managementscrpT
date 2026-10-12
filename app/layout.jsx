import './globals.css';

export const metadata = {
  metadataBase: new URL("https://www.fugthmanagement.space"),
  title: "FUGTH Management | Voice, Calls & Business Websites",
  description: "An AI receptionist and connected business command center to help service businesses answer calls, capture leads, and organize their next steps.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "FUGTH Management — A Better Way to Manage Customer Calls",
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
      <body className="bg-[#fafaf8] text-[#222522]">{children}</body>
    </html>
  );
}