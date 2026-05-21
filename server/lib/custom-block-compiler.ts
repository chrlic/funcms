/**
 * Compiles a Vue SFC source string by spawning compiler-worker.mjs as a
 * child process. This keeps @vue/compiler-sfc entirely outside Nitro's
 * module graph — no bundling, no consolidate, no velocityjs dep errors.
 */

import { spawn } from 'child_process'
import { join } from 'path'

// process.cwd() is always the project root whether running from source or .nuxt/dev/
const workerPath = join(process.cwd(), 'server/lib/compiler-worker.mjs')

export interface CompileResult {
  code: string
  errors: string[]
}

export function compileCustomBlock(source: string): Promise<CompileResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [workerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    child.on('close', () => {
      try {
        resolve(JSON.parse(stdout) as CompileResult)
      } catch {
        resolve({ code: '', errors: [stderr || 'Compiler worker returned invalid output'] })
      }
    })

    child.on('error', (err) => {
      resolve({ code: '', errors: [String(err)] })
    })

    child.stdin.write(JSON.stringify({ source }))
    child.stdin.end()
  })
}

/**
 * Evaluate a compiled block JS string and return a Vue component.
 * Safe to call on both Node (SSR) and browser — no compiler import needed here.
 */
export function evalCompiledBlock(
  compiledJs: string,
  vueRuntime: Record<string, unknown>,
  components: Record<string, unknown> = {}
): Record<string, unknown> {
  // eslint-disable-next-line no-new-func
  const factory = new Function(`return ${compiledJs}`)() as (v: unknown, c: unknown) => Record<string, unknown>
  return factory(vueRuntime, components)
}
