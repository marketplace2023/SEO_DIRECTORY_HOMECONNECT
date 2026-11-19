import { useAuth } from "@/auth/auth-provider";
import { PublicReviews } from "@/components/ecosystem/pilot-panels";
export function ReviewsPage() {
  const { user } = useAuth();
  return <PublicReviews professionalId={user?.professionalId || ""} />;
}
