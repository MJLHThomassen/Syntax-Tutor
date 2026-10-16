import * as fs from 'node:fs';
import * as path from 'node:path';
import { Language, Parser, type Tree } from 'web-tree-sitter';
import type { LanguageSpec } from './model';

/** One tree-sitter parser per language, loaded from the bundled .wasm grammars. */
export class Parsers {
  private constructor(private readonly byLanguage: Map<string, Parser>) {}

  static async load(wasmDir: string, specs: readonly LanguageSpec[]): Promise<Parsers> {
    await Parser.init({ locateFile: (file: string) => path.join(wasmDir, file) });
    const byLanguage = new Map<string, Parser>();
    for (const spec of specs) {
      const language = await Language.load(fs.readFileSync(path.join(wasmDir, spec.wasm)));
      const parser = new Parser();
      parser.setLanguage(language);
      byLanguage.set(spec.id, parser);
    }
    return new Parsers(byLanguage);
  }

  parse(languageId: string, text: string): Tree | undefined {
    return this.byLanguage.get(languageId)?.parse(text) ?? undefined;
  }

  dispose(): void {
    for (const parser of this.byLanguage.values()) parser.delete();
    this.byLanguage.clear();
  }
}
