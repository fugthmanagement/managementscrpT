import "./globals.css";
import CookieConsent from "../components/cookie-consent";

export const metadata={
 metadataBase:new URL("https://www.fugthmanagement.space"),
 title:"FUGTH Management | Calls, Leads & Business Websites",
 description:"Turn missed customer calls into next steps. AI reception, lead management and tailored business websites together.",
 alternates:{canonical:"/"},
 openGraph:{
  title:"FUGTH Management — Never Lose Track of the Next Customer",
  description:"Your calls, customers, appointments and website in one business workspace.",
  url:"https://www.fugthmanagement.space",
  siteName:"FUGTH Management",type:"website"
 },
 robots:{index:true,follow:true}
};
export default function RootLayout({children}){
 return <html lang="en"><body className="bg-white text-[#172631]">{children}<CookieConsent/></body></html>;
}
