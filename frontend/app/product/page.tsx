import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Valigo Platform",
  description: "Validation, AI insights, smart mapping and profiling in one platform.",
};

import GeneralProduct from "@/app/pages/general/general.product";

export default function Page() {
  return <GeneralProduct />;
}
