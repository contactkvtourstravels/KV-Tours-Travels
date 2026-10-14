import { PhasePlaceholder } from "@/components/admin/PhasePlaceholder";

export default function ReviewsPlaceholderPage() {
  return (
    <PhasePlaceholder
      title="Customer Reviews Moderation"
      phase="Scheduled for Phase 6 (Content Management)"
      description="Review moderation queue, customer sentiment inspection, verified booking badges, and publication controls."
      scopeNote="Phase 5 database schema contains the Review model. Full moderation workflows and public display are scheduled for subsequent phases."
    />
  );
}
