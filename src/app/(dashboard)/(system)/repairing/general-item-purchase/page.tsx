import { redirect } from "next/navigation";

export const metadata = {
  title: "General Item Purchase | Rigga Checklist",
  description: "Manage general item purchases",
};

export default function GeneralItemPurchasePage() {
  redirect("/repairing/general-item-purchase/item-request-form");
}