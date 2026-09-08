import { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://bifrost.omixsystems.store';

export const metadata: Metadata = {
  title: {
    default: 'Bifrost — Intelligent AI Model Gateway & Execution Layer',
    template: '%s | Bifrost',
  },
  description: 'Bifrost is an intelligent AI execution layer that routes, optimizes, caches, validates, and recovers AI requests across multiple model providers. One API for every model.',
  keywords: ['AI gateway', 'model routing', 'AI execution layer', 'OpenAI compatible', 'multi-provider', 'load balancing', 'failover', 'prompt optimization', 'LLM gateway', 'AI infrastructure'],
  authors: [{ name: 'OMIX Digital Solutions', url: 'https://omixsystems.store' }],
  creator: 'OMIX Digital Solutions',
  publisher: 'OMIX Digital Solutions',
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
    types: {
      'application/json': `${siteUrl}/openapi.json`,
      'text/plain': `${siteUrl}/llms.txt`,
      'text/yaml': `${siteUrl}/ml.yaml`,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    title: 'Bifrost — Intelligent AI Model Gateway',
    description: 'One API for every model. Route across providers, compress context, use cache, rotate quotas, survive failures — through a single OpenAI-compatible API.',
    siteName: 'Bifrost',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bifrost — Intelligent AI Model Gateway',
    description: 'One API for every model. Route across providers, compress context, use cache, rotate quotas, survive failures.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.ico' },
};

function JsonLd() {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OMIX Digital Solutions',
    url: 'https://omixsystems.store',
    email: 'omixsystems@gmail.com',
    address: { '@type': 'PostalAddress', addressLocality: 'Kericho', addressCountry: 'KE' },
  };

  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Bifrost',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cloud',
    description: 'Intelligent AI execution layer that routes, optimizes, caches, validates, and recovers AI requests across multiple model providers.',
    url: siteUrl,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: 'OMIX Digital Solutions' },
  };

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Bifrost',
    url: siteUrl,
    description: 'Intelligent AI execution layer. One API for every model.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/v1/models?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Dashboard', item: `${siteUrl}/dashboard` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-friendly product docs" />
        <link rel="alternate" type="text/yaml" href="/ml.yaml" title="Machine-readable product manifest" />
        <link rel="alternate" type="application/json" href="/openapi.json" title="OpenAPI specification" />
      </head>
      <body style={{ margin: 0, background: '#09090b', color: '#fafafa' }}>
        <JsonLd />
        {children}
      </body>
    </html>
  );
}
