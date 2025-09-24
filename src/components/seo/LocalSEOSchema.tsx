import React from 'react';

interface LocalBusinessSchemaProps {
  businessName?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  serviceArea?: string[];
  businessType?: string;
}

export const LocalBusinessSchema: React.FC<LocalBusinessSchemaProps> = ({
  businessName = "BuildDesk Construction Management",
  address = {
    streetAddress: "123 Construction Ave",
    addressLocality: "Denver",
    addressRegion: "CO", 
    postalCode: "80202",
    addressCountry: "US"
  },
  phone = "+1-800-BUILD-DESK",
  email = "hello@builddesk.com",
  website = "https://builddesk.com",
  serviceArea = ["Colorado", "Wyoming", "Utah", "New Mexico"],
  businessType = "SoftwareCompany"
}) => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": businessType,
    "name": businessName,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": address.streetAddress,
      "addressLocality": address.addressLocality,
      "addressRegion": address.addressRegion,
      "postalCode": address.postalCode,
      "addressCountry": address.addressCountry
    },
    "telephone": phone,
    "email": email,
    "url": website,
    "areaServed": serviceArea.map(area => ({
      "@type": "State",
      "name": area
    })),
    "serviceType": "Construction Management Software",
    "provider": {
      "@type": "Organization",
      "name": businessName,
      "url": website
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Construction Management Solutions",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Project Management Software",
            "description": "Comprehensive project management for construction teams"
          }
        },
        {
          "@type": "Offer", 
          "itemOffered": {
            "@type": "Service",
            "name": "Job Costing & Financial Management",
            "description": "Real-time job costing and financial tracking"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service", 
            "name": "Safety & OSHA Compliance",
            "description": "Digital safety management and OSHA compliance tools"
          }
        }
      ]
    },
    "priceRange": "$149-$599",
    "paymentAccepted": "Credit Card, ACH",
    "currenciesAccepted": "USD"
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schemaData)
      }}
    />
  );
};

interface ServiceAreaSchemaProps {
  serviceName: string;
  serviceDescription: string;
  serviceAreas: string[];
  provider: string;
}

export const ServiceAreaSchema: React.FC<ServiceAreaSchemaProps> = ({
  serviceName,
  serviceDescription, 
  serviceAreas,
  provider = "BuildDesk"
}) => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": serviceName,
    "description": serviceDescription,
    "provider": {
      "@type": "Organization",
      "name": provider,
      "url": "https://builddesk.com"
    },
    "areaServed": serviceAreas.map(area => ({
      "@type": "Place",
      "name": area
    })),
    "serviceType": "Construction Management Software",
    "category": "Business Software"
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schemaData)
      }}
    />
  );
};

export default LocalBusinessSchema;