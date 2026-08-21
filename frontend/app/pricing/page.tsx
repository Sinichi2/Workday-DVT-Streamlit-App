import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Valigo Pricing",
  description: "Plans for consultants, implementation teams and partners.",
};

import GeneralPricing from "@/app/pages/general/general.pricing";

export default function Page() {
  return <GeneralPricing />;
}
