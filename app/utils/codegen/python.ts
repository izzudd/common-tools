import type { SchemaField } from '~/types/schema'
import { toPascalCase, toSnakeCase, type CodegenOptions } from '~/types/codegen'

export function generatePythonDataclass(rootField: SchemaField, options: CodegenOptions): string {
  const rootName = toPascalCase(options.rootName || 'Root')
  const useUnion = options.pythonOptionalUnion ?? true
  const useSnake = options.pythonSnakeCase ?? true
  const classes: { name: string, code: string }[] = []
  const imports = new Set<string>()

  function wrapOptional(typeStr: string): string {
    if (useUnion) return `${typeStr} | None`
    imports.add('from typing import Optional')
    return `Optional[${typeStr}]`
  }

  function fieldToPythonType(field: SchemaField, parentName: string): string {
    let pyType: string
    switch (field.type) {
      case 'string':
        if (field.format === 'uuid') {
          imports.add('from uuid import UUID')
          pyType = 'UUID'
        } else if (field.format === 'date-time') {
          imports.add('from datetime import datetime')
          pyType = 'datetime'
        } else if (field.format === 'date') {
          imports.add('from datetime import date')
          pyType = 'date'
        } else {
          pyType = 'str'
        }
        break
      case 'integer':
        pyType = 'int'
        break
      case 'number':
        pyType = 'float'
        break
      case 'boolean':
        pyType = 'bool'
        break
      case 'null':
        pyType = 'None'
        break
      case 'array': {
        if (field.itemType === 'object' && field.itemProperties && field.itemProperties.length > 0) {
          const nestedName = `${parentName}${toPascalCase(field.name)}Item`
          generateDataclass(nestedName, field.itemProperties)
          pyType = `list[${nestedName}]`
        } else {
          const itemType = field.itemType ? fieldToPythonType({ ...field, type: field.itemType, name: '' }, parentName) : 'Any'
          if (itemType === 'Any') imports.add('from typing import Any')
          pyType = `list[${itemType}]`
        }
        break
      }
      case 'object': {
        if (field.properties && field.properties.length > 0) {
          const nestedName = `${parentName}${toPascalCase(field.name)}`
          generateDataclass(nestedName, field.properties)
          pyType = nestedName
        } else {
          pyType = 'dict[str, Any]'
          imports.add('from typing import Any')
        }
        break
      }
      default:
        imports.add('from typing import Any')
        pyType = 'Any'
    }
    return pyType
  }

  function generateDataclass(name: string, properties: SchemaField[]) {
    const lines: string[] = []
    lines.push('@dataclass')
    lines.push(`class ${name}:`)

    if (properties.length === 0) {
      lines.push('    pass')
      classes.push({ name, code: lines.join('\n') })
      return
    }

    // Sort: required fields first in standard python dataclass to avoid syntax error!
    const sortedProps = [...properties].sort((a, b) => {
      if (a.required && !b.required) return -1
      if (!a.required && b.required) return 1
      return 0
    })

    for (const prop of sortedProps) {
      const fieldPyName = useSnake ? toSnakeCase(prop.name) : prop.name
      let typeStr = fieldToPythonType(prop, name)

      if (!prop.required) {
        typeStr = wrapOptional(typeStr)
        lines.push(`    ${fieldPyName}: ${typeStr} = None`)
      } else {
        lines.push(`    ${fieldPyName}: ${typeStr}`)
      }
    }

    classes.push({ name, code: lines.join('\n') })
  }

  if (rootField.type === 'object' && rootField.properties) {
    generateDataclass(rootName, rootField.properties)
  } else if (rootField.type === 'array') {
    const itemType = fieldToPythonType({ ...rootField, type: rootField.itemType || 'string', name: 'item' }, rootName)
    classes.push({
      name: rootName,
      code: `@dataclass\nclass ${rootName}:\n    items: list[${itemType}]`
    })
  } else {
    classes.push({
      name: rootName,
      code: `@dataclass\nclass ${rootName}:\n    value: ${fieldToPythonType(rootField, rootName)}`
    })
  }

  const dataclassImport = 'from dataclasses import dataclass'
  const extraImports = Array.from(imports).sort().join('\n')
  const header = [dataclassImport, extraImports].filter(Boolean).join('\n')
  const body = classes.map(c => c.code).join('\n\n')

  return `${header}\n\n\n${body}`
}

export function generatePythonTypedDict(rootField: SchemaField, options: CodegenOptions): string {
  const rootName = toPascalCase(options.rootName || 'Root')
  const classes: { name: string, code: string }[] = []
  const imports = new Set<string>(['from typing import TypedDict'])
  let usesNotRequired = false

  function fieldToPythonType(field: SchemaField, parentName: string): string {
    let pyType: string
    switch (field.type) {
      case 'string':
        pyType = 'str'
        break
      case 'integer':
        pyType = 'int'
        break
      case 'number':
        pyType = 'float'
        break
      case 'boolean':
        pyType = 'bool'
        break
      case 'null':
        pyType = 'None'
        break
      case 'array': {
        if (field.itemType === 'object' && field.itemProperties && field.itemProperties.length > 0) {
          const nestedName = `${parentName}${toPascalCase(field.name)}Item`
          generateTypedDict(nestedName, field.itemProperties)
          pyType = `list[${nestedName}]`
        } else {
          const itemType = field.itemType ? fieldToPythonType({ ...field, type: field.itemType, name: '' }, parentName) : 'Any'
          if (itemType === 'Any') imports.add('from typing import Any')
          pyType = `list[${itemType}]`
        }
        break
      }
      case 'object': {
        if (field.properties && field.properties.length > 0) {
          const nestedName = `${parentName}${toPascalCase(field.name)}`
          generateTypedDict(nestedName, field.properties)
          pyType = nestedName
        } else {
          pyType = 'dict[str, Any]'
          imports.add('from typing import Any')
        }
        break
      }
      default:
        imports.add('from typing import Any')
        pyType = 'Any'
    }
    return pyType
  }

  function generateTypedDict(name: string, properties: SchemaField[]) {
    const lines: string[] = []
    lines.push(`class ${name}(TypedDict):`)

    if (properties.length === 0) {
      lines.push('    pass')
      classes.push({ name, code: lines.join('\n') })
      return
    }

    for (const prop of properties) {
      let typeStr = fieldToPythonType(prop, name)
      if (!prop.required) {
        usesNotRequired = true
        typeStr = `NotRequired[${typeStr}]`
      }
      lines.push(`    ${prop.name}: ${typeStr}`)
    }

    classes.push({ name, code: lines.join('\n') })
  }

  if (rootField.type === 'object' && rootField.properties) {
    generateTypedDict(rootName, rootField.properties)
  } else if (rootField.type === 'array') {
    const itemType = fieldToPythonType({ ...rootField, type: rootField.itemType || 'string', name: 'item' }, rootName)
    classes.push({
      name: rootName,
      code: `class ${rootName}(TypedDict):\n    items: list[${itemType}]`
    })
  } else {
    classes.push({
      name: rootName,
      code: `class ${rootName}(TypedDict):\n    value: ${fieldToPythonType(rootField, rootName)}`
    })
  }

  if (usesNotRequired) {
    imports.add('from typing import NotRequired')
  }

  const header = Array.from(imports).sort().join('\n')
  const body = classes.map(c => c.code).join('\n\n')

  return `${header}\n\n\n${body}`
}
