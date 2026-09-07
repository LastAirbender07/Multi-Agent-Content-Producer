/**
 * export_specs.cjs — exports TEMPLATE_CONTENT_SPECS to backend JSON
 * Run: node scripts/export_specs.cjs
 */
const path = require("path");
const fs   = require("fs");

const SRC = path.join(__dirname, "../frontend/constants/templateContentSpecs.ts");
const DST = path.join(__dirname, "../backend/configs/template_content_specs.json");

let src = fs.readFileSync(SRC, "utf8");

// 1. Remove all import lines
src = src.replace(/^import\b.*$/gm, "");

// 2. Remove export interface blocks (greedy match until closing brace at column 0)
src = src.replace(/^export\s+interface\s+\w+[^{]*\{[\s\S]*?^}/gm, "");

// 3. Remove type-alias lines
src = src.replace(/^export\s+type\s+\w+\s*=.*?;$/gm, "");

// 4. Remove TypeScript generic type annotations on variable declarations
//    e.g.  ": TemplateContentSpec[]" or ": Record<string, TemplateContentSpec>"
src = src.replace(/:\s*[A-Z]\w*(?:<[^>]*>)?(?:\[\])?\s*(?==)/g, "");

// 5. Remove "as const" at end of lines
src = src.replace(/\s+as\s+const\b/g, "");

// 5b. Remove TypeScript return type annotations on functions: ): SomeType {
src = src.replace(/\)\s*:\s*[A-Z]\w*(?:<[^>]*>)?(?:\[\])?\s*\{/g, ") {");
src = src.replace(/\)\s*:\s*[A-Z]\w*(?:<[^>]*>)?(?:\[\])?\s*\|[^{;]*/g, ") ");

// 5c. Remove parameter type annotations: (paramName: TypeName, ...)
// Only strip when "TypeName" starts with an uppercase letter OR is a known primitive
// This prevents stripping object property assignments like "fontSize: 64"
src = src.replace(/(\w)\s*:\s*(?=[A-Z]|string|number|boolean|null\b|undefined\b)[\w<>\[\] |]*/g, "$1");

// 6. Turn "export const X" → "const X" and "export function" → "function"
src = src.replace(/^export\s+(const|function)\s+/gm, "$1 ");

// 7. At end: print the specs as JSON
src += `\nconsole.log(JSON.stringify({specs:TEMPLATE_CONTENT_SPECS,generated_at:new Date().toISOString(),count:TEMPLATE_CONTENT_SPECS.length},null,2));\n`;

const tmp = path.join(__dirname, "_tmp_eval.cjs");
try {
  fs.writeFileSync(tmp, src);
  const { execSync } = require("child_process");
  const out = execSync(`node "${tmp}"`, { encoding: "utf8", timeout: 10000, maxBuffer: 4*1024*1024 });
  const parsed = JSON.parse(out);
  fs.mkdirSync(path.dirname(DST), { recursive: true });
  fs.writeFileSync(DST, JSON.stringify(parsed, null, 2));
  console.log(`✅ Exported ${parsed.count} specs → ${DST}`);
  parsed.specs.forEach(s => console.log(`   ${s.templateId}`));
} catch(e) {
  // Print first 80 chars of stdout/stderr for diagnosis
  const stderr = (e.stderr || "").slice(0, 300);
  const stdout = (e.stdout || "").slice(0, 300);
  console.error("❌ Export failed");
  if (stderr) { console.error("stderr:"); console.error(stderr); }
  if (stdout) { console.error("stdout:"); console.error(stdout); }
  // Write the temp file for inspection
  console.error(`Temp file: ${tmp}`);
  process.exit(1);
} finally {
  if (!process.exitCode) try { fs.unlinkSync(tmp); } catch {}
}
