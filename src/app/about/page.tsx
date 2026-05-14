import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PageShell
      title={`About ${APP_NAME}`}
      intro="A cashless local marketplace built to keep value circulating in communities."
    >
      <p className="text-sm leading-6 text-muted">
        {APP_NAME} lets neighbours trade goods and services using shared
        platform credits instead of money. It&apos;s designed to lower the
        barrier to participating in a local economy. You don&apos;t need cash
        on hand to get started, just something to offer. This page is
        editable by admins via the static-content tools in Milestone 5.
      </p>
    </PageShell>
  );
}
