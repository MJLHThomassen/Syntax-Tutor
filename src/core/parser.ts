import { Language, Parser, type Tree } from 'web-tree-sitter';
import type { LanguageSpec } from './model';

/** Reads one of the bundled .wasm files (the tree-sitter runtime or a grammar) by its file name. */
export type ReadWasm = (file: string) => Promise<Uint8Array>;

/**
 * One tree-sitter parser per language. A grammar is loaded the first time its
 * language is needed (see `ensure`), so in the browser only the grammars of the
 * languages you open get downloaded. No Node APIs: the files come from `read`.
 */
export class Parsers {
  private readonly byLanguage = new Map<string, Parser>();
  private readonly loading = new Map<string, Promise<boolean>>();

  private constructor(
    private readonly read: ReadWasm,
    private readonly specs: ReadonlyMap<string, LanguageSpec>,
  ) {}

  /** Starts the tree-sitter runtime for `specs`, and loads the grammars in `preload` (default: all) right away. */
  static async load(read: ReadWasm, specs: readonly LanguageSpec[], preload: readonly LanguageSpec[] = specs): Promise<Parsers> {
    // Handing over the runtime's bytes (instead of letting it fetch or read a path) works on desktop and on the web.
    await Parser.init({ wasmBinary: await read('tree-sitter.wasm'), locateFile: (file: string) => file });
    const parsers = new Parsers(read, new Map(specs.map((spec) => [spec.id, spec])));
    await Promise.all(preload.map((spec) => parsers.ensure(spec.id)));
    return parsers;
  }

  /** Whether the grammar for `languageId` is loaded, so `parse` can use it. */
  has(languageId: string): boolean {
    return this.byLanguage.has(languageId);
  }

  /** Loads the grammar for `languageId` if it isn't yet. Resolves to false if there is none or it failed to load. */
  ensure(languageId: string): Promise<boolean> {
    let loaded = this.loading.get(languageId);
    if (!loaded) {
      const spec = this.specs.get(languageId);
      loaded = spec ? this.loadGrammar(spec) : Promise.resolve(false);
      this.loading.set(languageId, loaded);
    }
    return loaded;
  }

  private async loadGrammar(spec: LanguageSpec): Promise<boolean> {
    try {
      const language = await Language.load(await this.read(spec.wasm));
      const parser = new Parser();
      parser.setLanguage(language);
      this.byLanguage.set(spec.id, parser);
      return true;
    } catch (err) {
      console.error(`Syntax Tutor: could not load ${spec.wasm}`, err);
      return false;
    }
  }

  /** Parse `text`; with `oldTree` (already edited, see editTree) only the changed parts are re-parsed. */
  parse(languageId: string, text: string, oldTree?: Tree): Tree | undefined {
    return this.byLanguage.get(languageId)?.parse(text, oldTree) ?? undefined;
  }

  /** The loaded grammar for a language (node types etc.), for tests and tools. */
  language(languageId: string): Language | undefined {
    return this.byLanguage.get(languageId)?.language ?? undefined;
  }

  dispose(): void {
    for (const parser of this.byLanguage.values()) parser.delete();
    this.byLanguage.clear();
    this.loading.clear();
  }
}
