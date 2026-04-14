import { Editable } from "next-content-overlay";
import { FlowSteps } from "@/components/FlowSteps";

export default function HomePage() {
  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Next.js App Router demo</p>
        <Editable k="home.headline" as="h1">
          Launch fast with content overlay
        </Editable>
        <Editable k="home.subtitle" as="p" multiline>
          Press Ctrl+Shift+E, click any text, and edit it right on the page. Save creates a draft.
          Publish writes to content/site.json. All file-backed — no database required.
        </Editable>
        <FlowSteps />
      </section>
    </main>
  );
}
