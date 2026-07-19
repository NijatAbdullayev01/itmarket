import { redirect } from "next/navigation";

import { defaultBoRoute, getBoNavItem } from "../components/bo-nav-config";

export default function BackofficeHomeRedirect() {
  redirect(getBoNavItem(defaultBoRoute).href);
}
