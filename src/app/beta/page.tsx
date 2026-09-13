import { permanentRedirect } from "next/navigation";

export default function BetaPage() {
  permanentRedirect("/status");
}
