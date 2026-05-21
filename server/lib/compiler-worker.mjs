import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const { parse, compileTemplate } = require('@vue/compiler-sfc')

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', chunk => { input += chunk })
process.stdin.on('end', () => {
  try {
    const { source } = JSON.parse(input)

    const { descriptor, errors: parseErrors } = parse(source)
    if (parseErrors.length) {
      process.stdout.write(JSON.stringify({ code: '', errors: parseErrors.map(e => String(e.message)) }))
      process.exit(0)
    }

    if (!descriptor.template) {
      process.stdout.write(JSON.stringify({ code: '', errors: ['SFC must have a <template> block'] }))
      process.exit(0)
    }

    const templateResult = compileTemplate({
      source: descriptor.template.content,
      filename: 'custom-block.vue',
      id: 'custom-block',
      scoped: false,
      compilerOptions: { mode: 'function' },
    })

    if (templateResult.errors?.length) {
      process.stdout.write(JSON.stringify({ code: '', errors: templateResult.errors.map(e => String(e.message ?? e)) }))
      process.exit(0)
    }

    let scriptContent = descriptor.script?.content?.trim() ?? ''

    // Extract defineProps(...) — pull out the definition object/array and remove the call
    let propsDefinition = 'undefined'
    const definePropsMatch = scriptContent.match(/(?:const\s+\w+\s*=\s*)?defineProps\s*\((\{[\s\S]*?\}|\[[\s\S]*?\])\s*\)/)
    if (definePropsMatch) {
      propsDefinition = definePropsMatch[1]
      scriptContent = scriptContent.replace(/(?:const\s+\w+\s*=\s*)?defineProps\s*\([\s\S]*?\)\s*\n?/, '').trim()
    }

    // The remaining script content runs inside setup(props, ctx) so `props` is in scope.
    // All Vue composition APIs are already destructured from __vue__ in the outer scope.
    const code = `(function(__vue__, __components__) {
  const { ref, computed, watch, watchEffect, onMounted, onUnmounted, reactive, toRef, toRefs, nextTick, h, defineComponent, withDefaults } = __vue__;

  const __renderFactory = new Function('Vue', ${JSON.stringify(templateResult.code + '\nreturn render')});
  const __render = __renderFactory(__vue__);

  return {
    props: ${propsDefinition},
    setup(props, ctx) {
      ${scriptContent}
      // Return all local refs/computeds so the template can access them
      const __locals = {};
      try {
        // Collect everything defined in this scope that looks like a ref or computed
        ${scriptContent.split('\n')
          .map(line => line.match(/^(?:const|let|var)\s+(\w+)\s*=/)?.[1])
          .filter(Boolean)
          .map(name => `try { __locals[${JSON.stringify(name)}] = ${name}; } catch(e) {}`)
          .join('\n        ')}
      } catch(e) {}
      return __locals;
    },
    render: __render,
  };
})`.trim()

    process.stdout.write(JSON.stringify({ code, errors: [] }))
    process.exit(0)
  } catch (err) {
    process.stdout.write(JSON.stringify({ code: '', errors: [String(err)] }))
    process.exit(0)
  }
})
