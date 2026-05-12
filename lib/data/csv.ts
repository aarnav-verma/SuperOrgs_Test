import { readFile } from "node:fs/promises";

import { parse } from "csv-parse/sync";

export async function readCsvFile(filePath: string): Promise<Record<string, string>[]> {
  const content = await readFile(filePath, "utf8");

  return parse(content, {
    bom: true,
    columns: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: false
  }) as Record<string, string>[];
}
