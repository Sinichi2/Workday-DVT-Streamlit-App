import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Valigo",
  description: "Request a demo and see Valigo run against your own extract.",
};

import GeneralContact from "@/app/pages/general/general.contact";

export default function Page() {
  return <GeneralContact />;
}
