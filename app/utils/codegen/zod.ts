import type { SchemaField } from '~/types/schema'
import { toPascalCase, isValidIdentifier, type CodegenOptions } from '~/types/codegen'

export function generateZodSchema(rootField: SchemaField, options: CodegenOptions): string {
  const rootName = toPascalCase(options.rootName || 'Root')
  const schemas: { name: string, code: string }[] = []

  function fieldToZod(field: SchemaField, parentName: string): string {
    let base: string
    switch (field.type) {
      case 'string':
        if (field.enum && field.enum.length > 0) {
          base = `z.enum([${field.enum.map(e => JSON.stringify(e)).join(', ')}])`
        } else if (field.format === 'email') {
          base = 'z.string().email()'
        } else if (field.format === 'uuid') {
          base = 'z.string().uuid()'
        } else if (field.format === 'uri') {
          base = 'z.string().url()'
        } else if (field.format === 'date-time' || field.format === 'date') {
          base = 'z.string().datetime()'
        } else if (field.format === 'ipv4') {
          base = 'z.string().ip({ version: "v4" })'
        } else {
          base = 'z.string()'
        }
        break
      case 'integer':
        base = 'z.number().int()'
        break
      case 'number':
        base = 'z.number()'
        break
      case 'boolean':
        base = 'z.boolean()'
        break
      case 'null':
        base = 'z.null()'
        break
      case 'array': {
        if (field.itemType === 'object' && field.itemProperties && field.itemProperties.length > 0) {
          const nestedName = `${parentName}${toPascalCase(field.name)}Item`
          generateZodObject(nestedName, field.itemProperties)
          base = `z.array(${nestedName}Schema)`
        } else {
          const itemSchema = field.itemType ? fieldToZod({ ...field, type: field.itemType, name: '' }, parentName) : 'z.unknown()'
          base = `z.array(${itemSchema})`
        }
        break
      }
      case 'object': {
        if (field.properties && field.properties.length > 0) {
          const nestedName = `${parentName}${toPascalCase(field.name)}`
          generateZodObject(nestedName, field.properties)
          base = `${nestedName}Schema`
        } else {
          base = 'z.record(z.string(), z.unknown())'
        }
        break
      }
      default:
        base = 'z.unknown()'
    }

    if (!field.required) {
      base += '.optional()'
    }

    return base
  }

  function generateZodObject(name: string, properties: SchemaField[]) {
    const lines: string[] = []
    lines.push(`export const ${name}Schema = z.object({`)
    for (const prop of properties) {
      const key = isValidIdentifier(prop.name) ? prop.name : JSON.stringify(prop.name)
      const zodCode = fieldToZod(prop, name)
      lines.push(`  ${key}: ${zodCode},`)
    }
    lines.push('});')

    if (options.zodInferType ?? true) {
      lines.push(`export type ${name} = z.infer<typeof ${name}Schema>;`)
    }

    schemas.push({ name, code: lines.join('\n') })
  }

  if (rootField.type === 'object' && rootField.properties) {
    generateZodObject(rootName, rootField.properties)
  } else if (rootField.type === 'array') {
    const itemZod = fieldToZod({ ...rootField, type: rootField.itemType || 'string', name: 'item' }, rootName)
    const code = [
      `export const ${rootName}Schema = z.array(${itemZod});`,
      (options.zodInferType ?? true) ? `export type ${rootName} = z.infer<typeof ${rootName}Schema>;` : ''
    ].filter(Boolean).join('\n')
    schemas.push({ name: rootName, code })
  } else {
    const code = [
      `export const ${rootName}Schema = ${fieldToZod(rootField, rootName)};`,
      (options.zodInferType ?? true) ? `export type ${rootName} = z.infer<typeof ${rootName}Schema>;` : ''
    ].filter(Boolean).join('\n')
    schemas.push({ name: rootName, code })
  }

  const importLine = `import { z } from 'zod';\n`
  const body = schemas.map(s => s.code).join('\n\n')
  return `${importLine}\n${body}`
}
