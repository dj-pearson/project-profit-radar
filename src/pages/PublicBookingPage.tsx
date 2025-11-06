import { useParams } from "react-router-dom";
import { PublicBookingForm } from "@/components/crm/PublicBookingForm";

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return <div className="flex items-center justify-center min-h-screen">Invalid booking link</div>;
  }

  return <PublicBookingForm slug={slug} />;
}