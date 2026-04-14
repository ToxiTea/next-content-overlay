import path from "node:path";
import { promises as fs } from "node:fs";
import { CliError } from "../../lib/errors.js";
import { ensureDir } from "../../lib/fs.js";

type SetupOptions = {
  cwd: string;
  force?: boolean;
};

const ROUTE_FILE_CONTENTS = `import { createContentAPI } from "next-content-overlay/server";

// Catch-all route handler for the inline CMS.
// Sub-routes: me, content, save, publish, history, restore, login
const handler = createContentAPI();

export const GET = handler;
export const POST = handler;
`;

const LAYOUT_SNIPPET = `// In app/layout.tsx — wrap your app in the provider so <Editable> components
// can hydrate from the published content file on the server.
//
// import { ContentOverlayProvider, EditModeToggle } from "next-content-overlay";
// import { getContent } from "next-content-overlay/server";
//
// export default async function RootLayout({ children }) {
//   const content = await getContent();
//   return (
//     <html>
//       <body>
//         <ContentOverlayProvider initialContent={content}>
//           {children}
//           <EditModeToggle />
//         </ContentOverlayProvider>
//       </body>
//     </html>
//   );
// }
`;

export async function runSetup(options: SetupOptions): Promise<void> {
  const routeDir = path.join(options.cwd, "app", "api", "content-overlay", "[...action]");
  const routeFile = path.join(routeDir, "route.ts");

  let exists = false;
  try {
    await fs.access(routeFile);
    exists = true;
  } catch {
    exists = false;
  }

  if (exists && !options.force) {
    throw new CliError(`API route already exists at ${path.relative(options.cwd, routeFile)}.`, {
      hint: "Re-run with --force to overwrite."
    });
  }

  await ensureDir(routeDir);
  await fs.writeFile(routeFile, ROUTE_FILE_CONTENTS, "utf8");

  console.log(`Created ${path.relative(options.cwd, routeFile)}`);
  console.log("");
  console.log("Next steps:");
  console.log("  1. Wrap your root layout in <ContentOverlayProvider> (see snippet below).");
  console.log("  2. Replace static text with <Editable k=\"your.key\">Default text</Editable>.");
  console.log("  3. Press Ctrl+Shift+E to toggle edit mode in development.");
  console.log("");
  console.log(LAYOUT_SNIPPET);
}
