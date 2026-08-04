import { redirect } from "next/navigation";

// The desktop site has no landing page yet — send visitors to the Mini App.
export default function HomePage() {
  redirect("/miniapp");
}
