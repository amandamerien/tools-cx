*Semântica do codemode (`execute`) e do gate de confirmação (`question`).*

**Parte 3** — o `execute` roda código (codemode) contra o **mesmo** conjunto de tools do turno normal (inclusive write/destructive, que o helper padrão da Cloudflare filtraria); o `question` é o gate de confirmação estruturado. Abaixo, os dois arquivos do monorepo, **literalmente**.

## tools/common/execute.ts

```ts
import { DynamicWorkerExecutor } from '@cloudflare/codemode'
import { generateTypes } from '@cloudflare/codemode/ai'
import { type ToolExecutionOptions, type ToolSet, tool } from 'ai'

import { z } from 'zod'
import description from '../../prompts/tools/execute.md?raw'
import { createAgentTools } from '../../util/tools/agent-adapter.js'
import {
  type ClickmaxToolContext,
  type ClickmaxToolModule,
  defineTool,
  defineToolModule,
} from '../../util/tools/types.js'
import { encodeToon } from '../../util/toon.js'

const executeToolInputSchema = z.object({
  code: z.string().describe('JavaScript async arrow function to execute'),
})
const loadExecuteMethodsInputSchema = z.object({
  names: z.array(z.string().min(1)).min(1).max(20).describe('Exact execute method names to load'),
})

/**
 * We intentionally do not use `createCodeTool()` here.
 *
 * Cloudflare's helper always filters out tools with `needsApproval`, which
 * would make Max expose a different tool surface inside `execute` than it does
 * in the normal turn. Max needs codemode to see the same tools so it can plan
 * multi-step workflows without silently losing write/destructive capabilities.
 *
 * This wrapper still relies on Cloudflare codemode for type generation and the
 * Worker sandbox executor; it only replaces the policy layer that drops tools.
 */
export function createExecuteModule(
  ctx: ClickmaxToolContext,
  modules: ClickmaxToolModule[],
  loader: WorkerLoader,
): ClickmaxToolModule {
  const tools = createAgentTools(ctx, modules, false, true)
  const runExecute = createExecuteRunner(loader, tools)
  const runLoadExecuteMethods = createLoadExecuteMethodsRunner(modules)

  return defineToolModule({
    tools: [
      defineTool({
        name: 'execute',
        title: 'Query clickmax',
        description: description.replace('{{methods}}', renderExecuteMethodCatalog(modules)),
        safety: 'read',
        inputSchema: executeToolInputSchema,
        outputSchema: undefined,
        execute: async (_ctx, { code }) => {
          const { error, result } = await runExecute(code)

          if (error) {
            throw new Error(error)
          }

          return result as any
        },
      }),
      defineTool({
        name: 'load_execute_methods',
        title: 'Load execute method signatures',
        description:
          'Load exact `execute` method input/output aliases for only the method names needed in this turn.',
        safety: 'read',
        inputSchema: loadExecuteMethodsInputSchema,
        outputSchema: undefined,
        execute: (_ctx, { names }) => runLoadExecuteMethods(names) as any,
      }),
    ],
  })
}

export function createExecuteTool(
  ctx: ClickmaxToolContext,
  modules: ClickmaxToolModule[],
  loader: WorkerLoader,
) {
  const tools = createAgentTools(ctx, modules, false, true)
  const runExecute = createExecuteRunner(loader, tools)

  return tool({
    title: 'Query clickmax',
    description: description.replace('{{methods}}', renderExecuteMethodCatalog(modules)),
    inputSchema: executeToolInputSchema,
    execute: async ({ code }: { code: string }) => {
      const result = await runExecute(code)
      return result.error || encodeToon(result.result)
    },
  })
}

export function createLoadExecuteMethodsTool(modules: ClickmaxToolModule[]) {
  const runLoadExecuteMethods = createLoadExecuteMethodsRunner(modules)

  return tool({
    title: 'Load execute method signatures',
    description:
      'Load exact `execute` method input/output aliases for only the method names needed in this turn.',
    inputSchema: loadExecuteMethodsInputSchema,
    execute: async ({ names }: { names: string[] }) => ({
      types: await runLoadExecuteMethods(names),
    }),
  })
}

function createExecuteRunner(loader: WorkerLoader, tools: ToolSet) {
  const executor = new DynamicWorkerExecutor({ loader })

  return async function runExecute(code: string) {
    // Max needs the sandbox to see the same tool surface as the normal turn,
    // including tools that the stock codemode helper would filter out.
    return executor.execute(code, [
      {
        name: 'codemode',
        fns: extractFns(tools),
      },
    ])
  }
}

function createLoadExecuteMethodsRunner(modules: ClickmaxToolModule[]) {
  const availableTools = Object.fromEntries(
    modules
      .flatMap((module) => module.tools)
      .filter(
        (tool) =>
          tool.execute !== undefined && tool.safety !== 'write' && tool.safety !== 'destructive',
      )
      .map((toolDefinition) => [
        toolDefinition.name,
        {
          description: toolDefinition.description,
          inputSchema: toolDefinition.inputSchema,
          outputSchema: toolDefinition.outputSchema,
        },
      ]),
  )

  return async function runLoadExecuteMethods(names: string[]) {
    const uniqueNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)))
    const missingNames = uniqueNames.filter((name) => !(name in availableTools))

    if (missingNames.length > 0) {
      throw new Error(`Unknown execute methods: ${missingNames.join(', ')}`)
    }

    const selectedTools = Object.fromEntries(
      uniqueNames
        .map((name) => [name, availableTools[name]])
        .filter((entry) => entry[1] !== undefined),
    )

    return generateTypes(selectedTools)
  }
}

function extractFns(tools: ToolSet) {
  const fns: Record<string, (...args: unknown[]) => Promise<unknown>> = {}

  for (const name in tools) {
    const toolDefinition = tools[name]

    if (!toolDefinition) {
      continue
    }

    const execute = toolDefinition.execute

    if (!execute) {
      fns[name] = async () => {
        throw new Error(
          `Tool "${name}" needs direct client interaction and cannot run inside execute.`,
        )
      }

      continue
    }

    // exclude approval required tools
    if (
      toolDefinition.needsApproval === true ||
      typeof toolDefinition.needsApproval === 'function'
    ) {
      continue
    }

    const executionOptions: ToolExecutionOptions = {
      messages: [],
      toolCallId: `execute:${name}:${crypto.randomUUID()}`,
    }

    fns[name] = async (args: unknown) => {
      return await execute(args, executionOptions)
    }
  }

  return fns
}

function renderExecuteMethodCatalog(modules: ClickmaxToolModule[]) {
  return modules
    .flatMap((module) => module.tools)
    .filter(
      (tool) =>
        tool.execute !== undefined && tool.safety !== 'write' && tool.safety !== 'destructive',
    )
    .map((definition) => `- ${definition.name}`)
    .join('\n')
}
```

## agentes/ferramentas/pergunta.ts

```ts
import { tool } from 'ai'
import { z } from 'zod'
import description from '../../prompts/tools/question.md?raw'

const questionToolOptionSchema = z.object({
  label: z.string().min(1),
  description: z.string(),
})

const questionToolBaseSchema = z.object({
  label: z.string().min(1).max(60),
  question: z.string().min(1).optional(),
})

const questionToolSelectSchema = questionToolBaseSchema.extend({
  type: z.literal('select').optional(),
  options: z.array(questionToolOptionSchema).min(1),
  multiple: z.boolean().optional(),
  custom: z.boolean().optional(),
  optional: z.boolean().optional(),
})

const questionToolTextSchema = questionToolBaseSchema.extend({
  type: z.literal('text'),
  placeholder: z.string().optional(),
  optional: z.boolean().optional(),
})

const questionToolNumberLikeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
})

const questionToolNumberSchema = questionToolBaseSchema
  .extend({
    type: z.literal('number'),
    placeholder: z.string().optional(),
    optional: z.boolean().optional(),
  })
  .merge(questionToolNumberLikeSchema)

const questionToolMoneySchema = questionToolBaseSchema
  .extend({
    type: z.literal('money'),
    currency: z.string().min(1).max(12).optional(),
    placeholder: z.string().optional(),
    optional: z.boolean().optional(),
  })
  .merge(questionToolNumberLikeSchema)

const questionToolDateBoundSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const questionToolColorSchema = questionToolBaseSchema.extend({
  type: z.literal('color'),
  optional: z.boolean().optional(),
})

const questionToolDateSchema = questionToolBaseSchema.extend({
  type: z.literal('date'),
  min: questionToolDateBoundSchema.optional(),
  max: questionToolDateBoundSchema.optional(),
  optional: z.boolean().optional(),
})

const questionToolUrlSchema = questionToolBaseSchema.extend({
  type: z.literal('url'),
  placeholder: z.string().optional(),
  optional: z.boolean().optional(),
})

const questionToolImageSchema = questionToolBaseSchema.extend({
  type: z.literal('image'),
  optional: z.boolean().optional(),
  suggestedDimensions: z
    .string()
    .min(1)
    .max(60)
    .optional()
    .describe('Optional client-facing size hint such as 1024x1024 or 1200x630.'),
})

const questionToolQuestionSchema = z.union([
  questionToolSelectSchema,
  questionToolTextSchema,
  questionToolNumberSchema,
  questionToolMoneySchema,
  questionToolColorSchema,
  questionToolDateSchema,
  questionToolUrlSchema,
  questionToolImageSchema,
])

const questionToolInputSchema = z.object({
  questions: z.array(questionToolQuestionSchema).min(1),
})

export const QuestionTool = tool({
  title: 'Ask structured questions',
  description,
  inputSchema: questionToolInputSchema,
})
```
