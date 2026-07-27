"use client";

export default function StorefrontError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="ui-container">
      <div className="ui-empty-state">
        <h1 className="ui-empty-state__title">Xəta baş verdi</h1>
        <p className="ui-empty-state__body">
          Səhifəni yükləyərkən gözlənilməz xəta oldu. Yenidən cəhd edin.
        </p>
        <button
          type="button"
          className="ui-btn ui-empty-state__action"
          onClick={() => reset()}
        >
          Yenidən cəhd et
        </button>
      </div>
    </div>
  );
}
