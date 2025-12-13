import { transformerNotationWordHighlight } from "@shikijs/transformers"
import { codeToHtml } from "shiki"
import type { ShikiTransformer } from "shiki"

export const transformers = [
  {
    code(node) {
      if (node.tagName === "code") {
        const raw = this.source
        node.properties["__raw__"] = raw

        if (raw.startsWith("npm install")) {
          node.properties["__npm__"] = raw
          node.properties["__yarn__"] = raw.replace("npm install", "yarn add")
          node.properties["__pnpm__"] = raw.replace("npm install", "pnpm add")
          node.properties["__bun__"] = raw.replace("npm install", "bun add")
        }

        if (raw.startsWith("npx create-")) {
          node.properties["__npm__"] = raw
          node.properties["__yarn__"] = raw.replace(
            "npx create-",
            "yarn create "
          )
          node.properties["__pnpm__"] = raw.replace(
            "npx create-",
            "pnpm create "
          )
          node.properties["__bun__"] = raw.replace("npx", "bunx --bun")
        }

        // npm create.
        if (raw.startsWith("npm create")) {
          node.properties["__npm__"] = raw
        }

        // npx.
        if (raw.startsWith("npx")) {
          node.properties["__npm__"] = raw
        }

        // npm run.
        if (raw.startsWith("npm run")) {
          node.properties["__npm__"] = raw
        }
      }
    },
  },
  transformerNotationWordHighlight(),
] as ShikiTransformer[]

export async function highlightCode(
  code: string,
  language: string = "tsx",
  options?: { showLineNumbers?: boolean }
) {
  const { showLineNumbers = true } = options ?? {}

  const html = await codeToHtml(code, {
    lang: language,
    themes: {
      dark: "github-dark",
      light: "github-light",
    },
    transformers: [
      {
        pre(node) {
          node.properties["class"] =
            "no-scrollbar text-[.8125rem] min-w-0 overflow-x-auto px-4 py-3.5 outline-none has-data-[highlighted-line]:px-0 has-data-[line-numbers]:px-0 has-data-[slot=tabs]:p-0 !bg-transparent"
        },
        code(node) {
          if (showLineNumbers) {
            node.properties["data-line-numbers"] = ""
          }
        },
        line(node) {
          node.properties["data-line"] = ""
        },
      },
      transformerNotationWordHighlight(),
    ],
  })

  return html
}

