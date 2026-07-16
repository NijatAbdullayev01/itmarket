import { CompareView } from "@/app/compare/compare-view";

export const metadata = {
  title: "Müqayisə",
  description: "Seçilmiş məhsulları xüsusiyyətlərinə görə müqayisə edin.",
};

export default function ComparePage() {
  return (
    <div className="ui-container">
      <CompareView />
    </div>
  );
}
