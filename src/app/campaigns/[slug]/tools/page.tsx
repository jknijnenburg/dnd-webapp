import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hammer } from "lucide-react";
import { requirePlayerPage } from "@/lib/auth/session";
import { playerGetCampaign } from "@/lib/dal/player";
import { CAMPAIGN_TOOLS } from "@/features/tools/registry";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/misc";

async function Tools({ params }: { params: Promise<{ slug: string }> }) {
  await requirePlayerPage();
  const { slug } = await params;
  const campaign = await playerGetCampaign(slug);
  if (!campaign) notFound();
  return (
    <>
      <PageHeader title="Werkzeuge" description="Hilfsmittel der Spielleitung für diese Kampagne." />
      {CAMPAIGN_TOOLS.length === 0 ? (
        <EmptyState
          icon={<Hammer />}
          title="Die Werkbank ist noch leer"
          description="Hier erscheinen künftig zusätzliche Hilfsmittel für diese Kampagne. Bis dahin findest du alles Wichtige bei den Händlern."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAMPAIGN_TOOLS.map((tool) => (
            <li key={tool.key}>
              <Link href={`/campaigns/${campaign.slug}/tools/${tool.path}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <tool.icon className="size-5 text-primary" aria-hidden /> {tool.title}
                    </CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ToolsPage({ params }: PageProps<"/campaigns/[slug]/tools">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Tools params={params} />
    </Suspense>
  );
}
