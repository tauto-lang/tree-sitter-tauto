# tree-sitter-tauto

A [tree-sitter](https://tree-sitter.github.io/) grammar for the Tauto programming language (`.taut` files).

It provides syntax highlighting, bracket matching, indentation and outline queries for editors. It is a syntax-only grammar: it does not type-check.

## Queries

| File | Purpose |
| --- | --- |
| `queries/highlights.scm` | Syntax highlighting |
| `queries/brackets.scm` | Bracket pairs |
| `queries/indents.scm` | Indentation |
| `queries/outline.scm` | Symbol outline |

## Differences from the compiler

The grammar follows the Tauto compiler's parser, including operator precedence. A few things are simplified for editor use:

- Newlines are treated as whitespace, so statements are not split by line breaks.
- Syntax literals (`` name`…` ``, `` name<`…`> ``, `` <<`…`>> ``, `` <<<`…`>>> `` and fenced blocks) are single tokens; their contents are not parsed.

## Development

Requires Node.js with Corepack and the tree-sitter CLI 0.25.10.

```sh
corepack enable
pnpm install --frozen-lockfile
```

Dependency install scripts are disabled, so the `tree-sitter` binary is not downloaded automatically. Download it from the [v0.25.10 release](https://github.com/tree-sitter/tree-sitter/releases/tag/v0.25.10) and verify its checksum. For example, on macOS (arm64):

```sh
curl -fsSLo tree-sitter.gz https://github.com/tree-sitter/tree-sitter/releases/download/v0.25.10/tree-sitter-macos-arm64.gz
echo "a6295d469669f6e901b6029ae6c129bd094df582d278c237fada413505cb9c42  tree-sitter.gz" | shasum -a 256 -c
gunzip -c tree-sitter.gz > node_modules/tree-sitter-cli/tree-sitter && rm tree-sitter.gz
chmod 755 node_modules/tree-sitter-cli/tree-sitter
```

Then:

```sh
pnpm run generate   # regenerate src/ from grammar.js
pnpm run test       # run test/corpus
pnpm exec tree-sitter parse path/to/file.taut
```

The files in `src/` are generated. Regenerate them after changing `grammar.js`.

## License

Licensed under either of [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE), at your option.

The headers in `src/tree_sitter/` come from tree-sitter and are under its MIT license ([LICENSE-TREE-SITTER](LICENSE-TREE-SITTER)).
