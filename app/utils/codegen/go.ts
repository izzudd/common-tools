import type { SchemaField } from '~/types/schema'
import { toPascalCase, type CodegenOptions } from '~/types/codegen'

export function generateGoStruct(rootField: SchemaField, options: CodegenOptions): string {
  const rootName = toPascalCase(options.rootName || 'Root')
  const omitEmpty = options.goOmitEmpty ?? true
  const pointerOptional = options.goPointerOptional ?? true
  const structs: { name: string, code: string }[] = []
  let usesTime = false

  function fieldToGoType(field: SchemaField, parentName: string): string {
    let goType: string
    switch (field.type) {
      case 'string':
        if (field.format === 'date-time' || field.format === 'date') {
          usesTime = true
          goType = 'time.Time'
        } else {
          goType = 'string'
        }
        break
      case 'integer':
        goType = 'int64'
        break
      case 'number':
        goType = 'float64'
        break
      case 'boolean':
        goType = 'bool'
        break
      case 'null':
        goType = 'any'
        break
      case 'array': {
        if (field.itemType === 'object' && field.itemProperties && field.itemProperties.length > 0) {
          const nestedName = `${parentName}${toPascalCase(field.name)}Item`
          generateStruct(nestedName, field.itemProperties)
          goType = `[]${nestedName}`
        } else {
          const itemType = field.itemType ? fieldToGoType({ ...field, type: field.itemType, name: '' }, parentName) : 'any'
          goType = `[]${itemType}`
        }
        break
      }
      case 'object': {
        if (field.properties && field.properties.length > 0) {
          const nestedName = `${parentName}${toPascalCase(field.name)}`
          generateStruct(nestedName, field.properties)
          goType = nestedName
        } else {
          goType = 'map[string]any'
        }
        break
      }
      default:
        goType = 'any'
    }

    if (!field.required && pointerOptional && !goType.startsWith('[]') && !goType.startsWith('map[')) {
      goType = `*${goType}`
    }

    return goType
  }

  function generateStruct(name: string, properties: SchemaField[]) {
    const lines: string[] = []
    lines.push(`type ${name} struct {`)

    if (properties.length === 0) {
      lines.push('}')
      structs.push({ name, code: lines.join('\n') })
      return
    }

    for (const prop of properties) {
      const goFieldName = toPascalCase(prop.name)
      const goType = fieldToGoType(prop, name)
      const tagParts = [prop.name]
      if (!prop.required && omitEmpty) {
        tagParts.push('omitempty')
      }
      lines.push(`\t${goFieldName} ${goType} \`json:"${tagParts.join(',')}"\``)
    }

    lines.push('}')
    structs.push({ name, code: lines.join('\n') })
  }

  if (rootField.type === 'object' && rootField.properties) {
    generateStruct(rootName, rootField.properties)
  } else if (rootField.type === 'array') {
    const itemType = fieldToGoType({ ...rootField, type: rootField.itemType || 'string', name: 'item' }, rootName)
    structs.push({
      name: rootName,
      code: `type ${rootName} []${itemType}`
    })
  } else {
    structs.push({
      name: rootName,
      code: `type ${rootName} ${fieldToGoType(rootField, rootName)}`
    })
  }

  const header = usesTime ? 'package models\n\nimport (\n\t"time"\n)\n' : 'package models\n'
  const body = structs.map(s => s.code).join('\n\n')

  return `${header}\n${body}`
}
