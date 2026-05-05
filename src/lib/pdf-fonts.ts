/**
 * Load Roboto TTF fonts from public/fonts and register into a jsPDF doc
 * so PDF export renders Vietnamese diacritics correctly.
 *
 * Cached at module level — file read happens once per server runtime.
 */

import { promises as fs } from "fs";
import path from "path";
import type jsPDF from "jspdf";

let cache: { regular: string; bold: string } | null = null;

async function loadFonts(): Promise<{ regular: string; bold: string }> {
  if (cache) return cache;
  const fontsDir = path.join(process.cwd(), "public", "fonts");
  const [regular, bold] = await Promise.all([
    fs.readFile(path.join(fontsDir, "Roboto-Regular.ttf")),
    fs.readFile(path.join(fontsDir, "Roboto-Bold.ttf")),
  ]);
  cache = {
    regular: regular.toString("base64"),
    bold: bold.toString("base64"),
  };
  return cache;
}

export async function registerVietnameseFont(doc: jsPDF): Promise<void> {
  const { regular, bold } = await loadFonts();
  doc.addFileToVFS("Roboto-Regular.ttf", regular);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", bold);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  doc.setFont("Roboto", "normal");
}
