// debug-products.mjs
import { readFileSync, readdirSync } from 'fs';

console.log("📁 Files in src/content/products/:");
const files = readdirSync('src/content/products/');
files.forEach(f => console.log("  -", f));

console.log("\n📄 First product frontmatter:");
const firstFile = files.find(f => f.endsWith('.md'));
if (firstFile) {
  const content = readFileSync(`src/content/products/${firstFile}`, 'utf-8');
  console.log(content.split('---')[1]);
}