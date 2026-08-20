import { redirect } from "next/navigation";

export default function Home() {
  // Direct to password login — no landing/sign-in choice.
  redirect("/login");
}
