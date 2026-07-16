import { EmptyState, EmptyStateLink } from "@itmarket/ui";

export default function NotFound() {
  return (
    <div className="ui-container">
      <EmptyState
        title="Səhifə tapılmadı"
        description="Axtardığınız səhifə mövcud deyil və ya silinib."
        action={<EmptyStateLink href="/" label="Ana səhifəyə qayıt" />}
      />
    </div>
  );
}
