import { FlowSteps } from "@/components/FlowSteps";
import { getContent } from "@/lib/content";

const HEADLINE_KEY = "app.page.launch-fast-with-content-overlay";
const SUBTITLE_KEY = "app.page.edit-this-line-from-the-cli-and-publish";

export default async function HomePage() {
  const content = await getContent();
  const headline = content[HEADLINE_KEY] ?? "Launch fast with content overlay";
  const subtitle = content[SUBTITLE_KEY] ?? "Edit this line from the CLI and publish.";

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Next.js App Router demo</p>
        <h1>{headline}</h1>
        <p>{subtitle}</p>
        <FlowSteps />
      </section>

      <div className="seed" aria-hidden="true">
        <p>Launch fast with content overlay</p>
        <p>Edit this line from the CLI and publish.</p>
      </div>
    </main>
  );
}
