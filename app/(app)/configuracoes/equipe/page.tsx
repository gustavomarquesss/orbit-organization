import { redirect } from "next/navigation";

// A gestão de pessoas agora vive no Painel Admin.
export default function EquipePage() {
  redirect("/admin");
}
