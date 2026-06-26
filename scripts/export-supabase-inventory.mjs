import "dotenv/config";
import fs from "node:fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const openApiPath = "supabase/schema-live-openapi.json";
const inventoryPath = "docs/supabase-live-inventory.md";

const response = await fetch(`${supabaseUrl}/rest/v1/`, {
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/openapi+json",
  },
});

if (!response.ok) {
  console.error(`Supabase OpenAPI fetch failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const spec = await response.json();
fs.writeFileSync(openApiPath, `${JSON.stringify(spec)}\n`);

const definitions = spec.definitions || spec.components?.schemas || {};
const objectNames = Object.keys(definitions)
  .filter((name) => !name.includes("_insert") && !name.includes("_update"))
  .sort();

let markdown = "# Supabase Live Schema Inventory\n\n";
markdown +=
  "Generated from Supabase PostgREST OpenAPI introspection for the linked Theoremz project. ";
markdown +=
  "It captures public tables/views/columns exposed by the API, not full SQL definitions for functions, triggers, policies, or constraints.\n\n";
markdown += `Object count: ${objectNames.length}\n\n`;

for (const objectName of objectNames) {
  const properties = definitions[objectName]?.properties || {};
  markdown += `## ${objectName}\n\n`;
  markdown += "| Column | Type | Default | Notes |\n";
  markdown += "| --- | --- | --- | --- |\n";

  for (const [column, meta] of Object.entries(properties)) {
    const type = meta.format || meta.type || "jsonb";
    const defaultValue =
      meta.default === undefined ? "" : String(meta.default).replace(/\|/g, "\\|");
    const notes = (meta.description || "").replace(/\n/g, " ").replace(/\|/g, "\\|");
    markdown += `| \`${column}\` | ${type} | ${defaultValue} | ${notes} |\n`;
  }

  markdown += "\n";
}

const rpcs = Object.keys(spec.paths || {})
  .filter((path) => path.startsWith("/rpc/"))
  .map((path) => path.slice(5))
  .sort();

markdown += "## RPCs Exposed\n\n";
for (const rpc of rpcs) {
  markdown += `- \`${rpc}\`\n`;
}

fs.writeFileSync(inventoryPath, markdown);

console.log(`Wrote ${openApiPath}`);
console.log(`Wrote ${inventoryPath}`);
