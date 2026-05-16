import './globals.css';

export const metadata = {
  title: 'Fugth Management',
  description: 'AI That Sounds Like a Human',
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