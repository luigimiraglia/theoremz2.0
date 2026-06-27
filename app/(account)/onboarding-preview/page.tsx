import { redirect } from "next/navigation";

export default function OnboardingPreviewRoute() {
  redirect("/onboarding?preview=1&redirect=%2Faccount");
}
