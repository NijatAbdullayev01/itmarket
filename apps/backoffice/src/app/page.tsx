import { Operations } from "./operations";

export default function BackofficeHome() {
  return (
    <>
      <a className="skip-link" href="#staff-content">
        Əsas məzmuna keç
      </a>
      <header className="office-header">
        <div className="office-brand">
          <span className="office-mark" aria-hidden="true">
            IM
          </span>
          <div>
            <strong>IT Market</strong>
            <span>Əməliyyat mərkəzi</span>
          </div>
        </div>
        <div className="staff-label">
          <span aria-hidden="true" />
          Yalnız əməkdaşlar üçün
        </div>
      </header>

      <Operations />

      <footer className="office-footer">
        <span>IT Market · Daxili səth</span>
        <span>Auth · Kataloq · Stok · Fulfillment · POS</span>
      </footer>
    </>
  );
}
