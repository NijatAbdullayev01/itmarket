import { redirect } from "next/navigation";

export default function InventoryTransferRedirectPage() {
  redirect("/inventory/receipt");
}
