import type { SchemaField, JsonSchemaType, StringFormat } from '~/types/schema'
import { generateFieldId } from '~/utils/schema'

/**
 * Checks whether an unknown object looks like a JSON Schema root document
 */
export function isJsonSchemaDocument(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return false
  }

  const record = obj as Record<string, unknown>
  return Boolean(
    record.$schema
    || record.type
    || record.properties
    || record.items
    || record.definitions
    || record.$defs
    || (record.title && typeof record.title === 'string')
  )
}

function parseType(rawType: unknown): { type: JsonSchemaType, isNullable: boolean } {
  if (Array.isArray(rawType)) {
    const isNullable = rawType.includes('null')
    const primary = rawType.find(t => t !== 'null') as JsonSchemaType || 'string'
    return { type: primary, isNullable }
  }

  if (typeof rawType === 'string') {
    const validTypes: JsonSchemaType[] = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null']
    if (validTypes.includes(rawType as JsonSchemaType)) {
      return { type: rawType as JsonSchemaType, isNullable: false }
    }
  }

  return { type: 'object', isNullable: false }
}

/**
 * Parses a JSON Schema definition (or subschema) into a SchemaField tree
 */
export function parseJsonSchemaToField(name: string, rawSchema: unknown, isRequired = true): SchemaField {
  const id = generateFieldId()

  if (typeof rawSchema !== 'object' || rawSchema === null || Array.isArray(rawSchema)) {
    return {
      id,
      name,
      type: 'string',
      required: isRequired
    }
  }

  const s = rawSchema as Record<string, unknown>

  // Inferred type from properties or items if type omitted
  let resolvedType: JsonSchemaType = 'object'
  let isNullable = false

  if (s.type) {
    const parsed = parseType(s.type)
    resolvedType = parsed.type
    isNullable = parsed.isNullable
  } else if (s.properties) {
    resolvedType = 'object'
  } else if (s.items) {
    resolvedType = 'array'
  } else if (s.enum && Array.isArray(s.enum)) {
    resolvedType = 'string'
  }

  const field: SchemaField = {
    id,
    name,
    type: resolvedType,
    required: isRequired && !isNullable,
    description: typeof s.description === 'string' ? s.description : undefined,
    format: typeof s.format === 'string' ? (s.format as StringFormat) : undefined,
    minimum: typeof s.minimum === 'number' ? s.minimum : undefined,
    maximum: typeof s.maximum === 'number' ? s.maximum : undefined,
    minLength: typeof s.minLength === 'number' ? s.minLength : undefined,
    maxLength: typeof s.maxLength === 'number' ? s.maxLength : undefined
  }

  if (Array.isArray(s.enum)) {
    field.enum = s.enum.map(e => String(e))
  }

  // Handle Object properties
  if (resolvedType === 'object' && s.properties && typeof s.properties === 'object') {
    const requiredKeys = new Set<string>()
    if (Array.isArray(s.required)) {
      s.required.forEach(k => typeof k === 'string' && requiredKeys.add(k))
    }

    const properties: SchemaField[] = []
    const propsObj = s.properties as Record<string, unknown>
    for (const [propKey, propSubSchema] of Object.entries(propsObj)) {
      const isReq = requiredKeys.has(propKey)
      properties.push(parseJsonSchemaToField(propKey, propSubSchema, isReq))
    }
    field.properties = properties
  }

  // Handle Array items
  if (resolvedType === 'array' && s.items) {
    if (typeof s.items === 'object' && s.items !== null && !Array.isArray(s.items)) {
      const itemSub = s.items as Record<string, unknown>
      const itemParsed = parseJsonSchemaToField('item', itemSub, true)
      field.itemType = itemParsed.type
      if (itemParsed.type === 'object' && itemParsed.properties) {
        field.itemProperties = itemParsed.properties
      }
    } else {
      field.itemType = 'string'
    }
  }

  return field
}
