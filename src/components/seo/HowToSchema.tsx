import React from 'react';

interface HowToStep {
  name: string;
  text: string;
  image?: string;
  url?: string;
}

interface HowToSchemaProps {
  name: string;
  description: string;
  totalTime?: string;
  estimatedCost?: {
    currency: string;
    value: string;
  };
  supply?: string[];
  tool?: string[];
  steps: HowToStep[];
  url: string;
}

export const HowToSchema: React.FC<HowToSchemaProps> = ({
  name,
  description,
  totalTime,
  estimatedCost,
  supply,
  tool,
  steps,
  url
}) => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": name,
    "description": description,
    "image": steps.find(step => step.image)?.image || `https://builddesk.com/images/${name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
    "totalTime": totalTime,
    "estimatedCost": estimatedCost ? {
      "@type": "MonetaryAmount",
      "currency": estimatedCost.currency,
      "value": estimatedCost.value
    } : undefined,
    "supply": supply?.map(item => ({
      "@type": "HowToSupply",
      "name": item
    })),
    "tool": tool?.map(item => ({
      "@type": "HowToTool", 
      "name": item
    })),
    "step": steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text,
      "image": step.image,
      "url": step.url || url
    })),
    "url": url
  };

  // Remove undefined properties
  Object.keys(schemaData).forEach(key => {
    if (schemaData[key as keyof typeof schemaData] === undefined) {
      delete schemaData[key as keyof typeof schemaData];
    }
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schemaData)
      }}
    />
  );
};

export default HowToSchema;