import React from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface GenericPageProps {
  title: string;           // SEO title (will append | BuildDesk)
  description: string;     // Meta description (<=160 chars)
  canonical: string;       // Canonical path e.g. "/projects"
  h1?: string;             // Optional H1 override; defaults to title
  children?: React.ReactNode;
}

export const GenericPage: React.FC<GenericPageProps> = ({
  title,
  description,
  canonical,
  h1,
  children
}) => {
  const pageTitle = `${title} | BuildDesk`;
  const h1Text = h1 || title;

  return (
    <DashboardLayout title={title}>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
      </Helmet>
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">{h1Text}</h1>
        <p className="text-muted-foreground">{description}</p>
        {children && (
          <section>
            {children}
          </section>
        )}
      </main>
    </DashboardLayout>
  );
};
