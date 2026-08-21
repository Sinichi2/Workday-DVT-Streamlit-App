import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Valigo",
  description: "Building the intelligence layer for enterprise data migration.",
};

import GeneralAbout from "@/app/pages/general/general.about";

export default function Page() {
  return <GeneralAbout />;
}
