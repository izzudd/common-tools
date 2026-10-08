import type { SchemaField } from '~/types/schema'
import { toPascalCase, isValidIdentifier, type CodegenOptions } from '~/types/codegen'

export function generateTypeScriptType(rootField: SchemaField, options: CodegenOptions): string {
  const rootName = toPascalCase(options.rootName || 'Root')
  const useInterface = (options.tsTypeOrInterface ?? 'interface') === 'interface'
  const isReadonly = options.tsReadonly ?? false
  const types: { name: string, code: string }[] = []

  function fieldToTsType(field: SchemaField, parentName: string): string {
    switch (field.type) {
      case 'string':
        if (field.enum && field.enum.length > 0) {
          return field.enum.map(e => JSON.stringify(e)).join(' | ')
        }
        return 'string'
      case 'number':
      case 'integer':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'null':
        return 'null'
      case 'array': {
        if (field.itemType === 'object' && field.itemProperties && field.itemProperties.length > 0) {
          const nestedName = `${parentName}${toPascalCase(field.name)}Item`
          generateTypeDef(nestedName, field.itemProperties)
          return `${nestedName}[]`
        }
        const primType = field.itemType === 'integer' ? 'number' : field.itemType || 'string'
        return `${primType}[]`
      }
      case 'object': {
        if (field.properties && field.properties.length > 0) {
          const nestedName = `${parentName}${toPascalCase(field.name)}`
          generateTypeDef(nestedName, field.properties)
          return nestedName
        }
        return 'Record<string, unknown>'
      }
      default:
        return 'unknown'
    }
  }

  function generateTypeDef(name: string, properties: SchemaField[]) {
    const lines: string[] = []
    if (useInterface) {
      lines.push(`export interface ${name} {`)
    } else {
      lines.push(`export type ${name} = {`)
    }

    for (const prop of properties) {
      const key = isValidIdentifier(prop.name) ? prop.name : JSON.stringify(prop.name)
      const opt = prop.required ? '' : '?'
      const ro = isReadonly ? 'readonly ' : ''
      const tsType = fieldToTsType(prop, name)
      lines.push(`  ${ro}${key}${opt}: ${tsType};`)
    }

    lines.push(useInterface ? '}' : '};')
    types.push({ name, code: lines.join('\n') })
  }

  if (rootField.type === 'object' && rootField.properties) {
    generateTypeDef(rootName, rootField.properties)
  } else if (rootField.type === 'array') {
    const itemType = fieldToTsType({ ...rootField, type: rootField.itemType || 'string', name: 'item' }, rootName)
    types.push({
      name: rootName,
      code: `export type ${rootName} = ${itemType}[];`
    })
  } else {
    types.push({
      name: rootName,
      code: `export type ${rootName} = ${fieldToTsType(rootField, rootName)};`
    })
  }

  return types.map(t => t.code).join('\n\n')
}
