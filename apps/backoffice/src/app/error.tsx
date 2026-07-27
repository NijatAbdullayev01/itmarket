"use client";

import { EmptyState, EmptyStateButton } from "@itmarket/ui";

export default function BackofficeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="ui-container">
      <EmptyState
        title="Xəta baş verdi"
        titleAs="h1"
        description="Səhifəni yükləyərkən gözlənilməz xəta oldu. Yenidən cəhd edin."
        action={
          <EmptyStateButton label="Yenidən cəhd et" onClick={() => reset()} />
        }
      />
    </div>
  );
}
