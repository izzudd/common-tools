import type { SchemaField } from '~/types/schema'
import { toPascalCase, toSnakeCase, type CodegenOptions } from '~/types/codegen'

export function generatePydanticModel(rootField: SchemaField, options: CodegenOptions): string {
  const rootName = toPascalCase(options.rootName || 'Root')
  const useUnion = options.pythonOptionalUnion ?? true // Python 3.10+ (type | None)
  const useSnake = options.pythonSnakeCase ?? true
  const models: { name: string, code: string }[] = []
  const imports = new Set<string>()
  const pydanticImports = new Set<string>(['BaseModel'])

  function wrapOptional(typeStr: string): string {
    if (useUnion) {
      return `${typeStr} | None`
    }
    imports.add('from typing import Optional')
    return `Optional[${typeStr}]`
  }

  function fieldToPythonType(field: SchemaField, parentName: string): string {
    let pyType: string
    switch (field.type) {
      case 'string':
        if (field.format === 'email') {
          pydanticImports.add('EmailStr')
          pyType = 'EmailStr'
        } else if (field.format === 'uuid') {
          imports.add('from uuid import UUID')
          pyType = 'UUID'
        } else if (field.format === 'uri') {
          pydanticImports.add('HttpUrl')
          pyType = 'HttpUrl'
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
          generateModel(nestedName, field.itemProperties)
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
          generateModel(nestedName, field.properties)
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

  function generateModel(name: string, properties: SchemaField[]) {
    const lines: string[] = []
    lines.push(`class ${name}(BaseModel):`)

    if (properties.length === 0) {
      lines.push('    pass')
      models.push({ name, code: lines.join('\n') })
      return
    }

    for (const prop of properties) {
      const fieldPyName = useSnake ? toSnakeCase(prop.name) : prop.name
      let typeStr = fieldToPythonType(prop, name)
      const needsAlias = useSnake && fieldPyName !== prop.name

      if (!prop.required) {
        typeStr = wrapOptional(typeStr)
        if (needsAlias) {
          pydanticImports.add('Field')
          lines.push(`    ${fieldPyName}: ${typeStr} = Field(default=None, alias="${prop.name}")`)
        } else {
          lines.push(`    ${fieldPyName}: ${typeStr} = None`)
        }
      } else {
        if (needsAlias) {
          pydanticImports.add('Field')
          lines.push(`    ${fieldPyName}: ${typeStr} = Field(..., alias="${prop.name}")`)
        } else {
          lines.push(`    ${fieldPyName}: ${typeStr}`)
        }
      }
    }

    models.push({ name, code: lines.join('\n') })
  }

  if (rootField.type === 'object' && rootField.properties) {
    generateModel(rootName, rootField.properties)
  } else if (rootField.type === 'array') {
    const itemType = fieldToPythonType({ ...rootField, type: rootField.itemType || 'string', name: 'item' }, rootName)
    models.push({
      name: rootName,
      code: `class ${rootName}(BaseModel):\n    items: list[${itemType}]`
    })
  } else {
    models.push({
      name: rootName,
      code: `class ${rootName}(BaseModel):\n    value: ${fieldToPythonType(rootField, rootName)}`
    })
  }

  const pydanticHeader = `from pydantic import ${Array.from(pydanticImports).sort().join(', ')}`
  const extraImports = Array.from(imports).sort().join('\n')
  const header = [pydanticHeader, extraImports].filter(Boolean).join('\n')
  const body = models.map(m => m.code).join('\n\n')

  return `${header}\n\n\n${body}`
}
