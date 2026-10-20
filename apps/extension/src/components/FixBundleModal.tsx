import React, { useState } from 'react';
import { Download, Copy, Check, Code, X } from 'lucide-react';
import type { FactsConfig } from '@agentlens/schema';

interface FixBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  scrapedData: {
    title: string;
    h1: string;
    metaDesc: string;
    prices: string[];
    platform: string;
    url: string;
  };
}

export const FixBundleModal: React.FC<FixBundleModalProps> = ({
  isOpen,
  onClose,
  scrapedData,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'jsonld' | 'component'>('config');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const urlObj = new URL(scrapedData.url);
  const domain = urlObj.origin;
  const brandName = scrapedData.h1 || 'MyBrand';
  const priceVal = scrapedData.prices[0]?.replace(/[^\d.]/g, '') || '99.00';

  // Auto-generate facts.config.json
  const generatedConfig: FactsConfig = {
    $schema: 'https://agentlens.dev/schema/facts.config.v1.json',
    version: '1.0',
    site: {
      canonicalDomain: domain,
      defaultLocale: 'en-US',
      robotsMode: 'permissive',
    },
    entity: {
      id: `${domain}/#organization`,
      name: brandName,
      legalName: `${brandName} Inc.`,
      url: domain,
      logo: `${domain}/logo.png`,
      foundingDate: '2024-01-01',
      countryOfOrigin: 'US',
      sameAs: ['https://www.wikidata.org/entity/Q11000000'],
    },
    offerings: [
      {
        id: `prod-${brandName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: brandName,
        category: 'Consumer Goods',
        price: parseFloat(priceVal) || 99,
        priceCurrency: 'USD',
        availability: 'InStock',
        asOf: new Date().toISOString().split('T')[0]!,
        quotableSummary: `${brandName} delivers verified capabilities and technical specifications engineered for reliable performance and interoperability.`,
        specs: {
          platform: scrapedData.platform,
        },
      },
    ],
    ncs: {
      schemaVersion: 'ncs:v1',
      constraints: [
        {
          id: 'nc-unsupported-claims',
          capability: 'unsupported-features',
          value: false,
          modality: 'cannot',
          statement: `No. ${brandName} does not claim or support features outside its published official specifications.`,
          asOf: new Date().toISOString().split('T')[0]!,
          reviewBy: '2027-12-31',
          evidence: `${domain}/specifications`,
          aliases: ['unofficial mods', 'third-party warranty'],
        },
      ],
      closedWorld: [],
    },
  };

  const configJson = JSON.stringify(generatedConfig, null, 2);

  // Unified JSON-LD @graph
  const jsonLdGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': generatedConfig.entity.id,
        name: generatedConfig.entity.name,
        url: generatedConfig.entity.url,
        logo: generatedConfig.entity.logo,
        sameAs: generatedConfig.entity.sameAs,
      },
      {
        '@type': 'Product',
        '@id': `${domain}#product`,
        name: brandName,
        description: generatedConfig.offerings[0]?.quotableSummary,
        offers: {
          '@type': 'Offer',
          price: priceVal,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
      },
    ],
  };

  const jsonLdString = JSON.stringify(jsonLdGraph, null, 2);

  // Framework Component
  let componentCode = '';
  if (scrapedData.platform === 'Next.js' || scrapedData.platform === 'Static HTML') {
    componentCode = `// components/AgentFacts.tsx
export default function AgentFacts() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ${JSON.stringify(jsonLdString)} }}
      />
      <div data-agent-section="brand-facts" className="sr-only">
        <h1>${brandName}</h1>
        <p>${generatedConfig.offerings[0]?.quotableSummary}</p>
        <p>Price: $${priceVal} USD</p>
      </div>
    </>
  );
}`;
  } else if (scrapedData.platform === 'Shopify') {
    componentCode = `<!-- snippets/agentlens-facts.liquid -->
<script type="application/ld+json">
${jsonLdString}
</script>
<div data-agent-section="brand-facts">
  <h3>{{ product.title }}</h3>
  <p>{{ product.description | strip_html | truncatewords: 50 }}</p>
  <span>{{ product.price | money }}</span>
</div>`;
  } else {
    componentCode = `<?php
// agentlens-facts.php
add_action('wp_head', function() {
  echo '<script type="application/ld+json">' . '${jsonLdString.replace(/'/g, "\\'")}' . '</script>';
});`;
  }

  const activeContent =
    activeTab === 'config' ? configJson :
    activeTab === 'jsonld' ? jsonLdString : componentCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename =
      activeTab === 'config' ? 'facts.config.json' :
      activeTab === 'jsonld' ? 'brand-facts.ld.json' :
      scrapedData.platform === 'Shopify' ? 'agentlens-facts.liquid' :
      scrapedData.platform === 'WordPress' ? 'agentlens-facts.php' : 'AgentFacts.tsx';

    const blob = new Blob([activeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-[390px] max-h-[520px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-slate-100">
              Export Fix Bundle ({scrapedData.platform})
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-1 text-[11px] font-medium rounded ${
              activeTab === 'config' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            facts.config.json
          </button>
          <button
            onClick={() => setActiveTab('jsonld')}
            className={`flex-1 py-1 text-[11px] font-medium rounded ${
              activeTab === 'jsonld' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            JSON-LD @graph
          </button>
          <button
            onClick={() => setActiveTab('component')}
            className={`flex-1 py-1 text-[11px] font-medium rounded ${
              activeTab === 'component' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {scrapedData.platform} Snippet
          </button>
        </div>

        {/* Code Viewer */}
        <div className="flex-1 p-2.5 overflow-auto bg-slate-950 text-[10px] font-mono text-slate-300 leading-relaxed">
          <pre className="whitespace-pre-wrap">{activeContent}</pre>
        </div>

        {/* Footer actions */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
