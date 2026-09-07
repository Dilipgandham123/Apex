import type { Metadata } from "next";
import { MotionProvider } from "@/components/motion-provider";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sri Sai Anu Motor Driving School | Madhapur, Hyderabad",
  description: "Manual and automatic driving courses with RTO assistance in Madhapur, Hyderabad.",
  keywords: ["driving school Madhapur", "driving classes Hyderabad", "manual driving lessons", "automatic driving lessons", "driving licence assistance"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Sri Sai Anu Motor Driving School",
    description: "Manual and automatic driving courses with parking practice, mechanical basics, and licence assistance in Madhapur.",
    type: "website",
    locale: "en_IN",
  },
  robots: { index: true, follow: true },
};

const localBusiness = {
  "@context": "https://schema.org",
  "@type": "DrivingSchool",
  name: "Sri Sai Anu Motor Driving School",
  telephone: "+91 81063 73266",
  address: {
    "@type": "PostalAddress",
    streetAddress: "2-72/1, Indian Oil petrol pump line, opposite State Bank of India, Megha Hills, Sri Sai Nagar",
    addressLocality: "Madhapur",
    addressRegion: "Telangana",
    postalCode: "500081",
    addressCountry: "IN",
  },
  openingHours: "Mo-Su 06:00-19:00",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}/>
        <ServiceWorkerRegistration />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
