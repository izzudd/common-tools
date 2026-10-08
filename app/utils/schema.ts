import type {
  SchemaField,
  JsonSchemaType,
  StringFormat,
  SchemaGeneratorOptions
} from '~/types/schema'

let nextId = 1
export function generateFieldId(): string {
  return `field_${Date.now()}_${nextId++}`
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const URI_REGEX = /^https?:\/\/[^\s$.?#].[^\s]*$/i
const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

export function detectStringFormat(val: string): StringFormat {
  if (EMAIL_REGEX.test(val)) return 'email'
  if (UUID_REGEX.test(val)) return 'uuid'
  if (URI_REGEX.test(val)) return 'uri'
  if (DATETIME_REGEX.test(val)) return 'date-time'
  if (DATE_REGEX.test(val)) return 'date'
  if (IPV4_REGEX.test(val)) return 'ipv4'
  return ''
}

/**
 * Recursively infer SchemaField structure from raw parsed JSON data
 */
export function inferSchemaFromData(name: string, data: unknown, isRequired = true): SchemaField {
  const id = generateFieldId()

  if (data === null || data === undefined) {
    return { id, name, type: 'null', required: isRequired }
  }

  if (typeof data === 'boolean') {
    return { id, name, type: 'boolean', required: isRequired }
  }

  if (typeof data === 'number') {
    return {
      id,
      name,
      type: Number.isInteger(data) ? 'integer' : 'number',
      required: isRequired
    }
  }

  if (typeof data === 'string') {
    const format = detectStringFormat(data)
    return {
      id,
      name,
      type: 'string',
      required: isRequired,
      format: format || undefined
    }
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return {
        id,
        name,
        type: 'array',
        required: isRequired,
        itemType: 'string'
      }
    }

    const firstItem = data[0]
    if (typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
      // Merge keys across all items in array
      const allKeys = new Set<string>()
      for (const item of data) {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(k => allKeys.add(k))
        }
      }

      const itemProps: SchemaField[] = []
      for (const key of allKeys) {
        // Find first item having this key
        const sampleVal = (data as Record<string, unknown>[]).find(item => item[key] !== undefined)?.[key]
        itemProps.push(inferSchemaFromData(key, sampleVal, true))
      }

      return {
        id,
        name,
        type: 'array',
        required: isRequired,
        itemType: 'object',
        itemProperties: itemProps
      }
    } else {
      let inferredPrimitiveType: JsonSchemaType = 'string'
      if (typeof firstItem === 'number') {
        inferredPrimitiveType = Number.isInteger(firstItem) ? 'integer' : 'number'
      } else if (typeof firstItem === 'boolean') {
        inferredPrimitiveType = 'boolean'
      }

      return {
        id,
        name,
        type: 'array',
        required: isRequired,
        itemType: inferredPrimitiveType
      }
    }
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const properties: SchemaField[] = Object.entries(obj).map(([key, val]) => {
      return inferSchemaFromData(key, val, true)
    })

    return {
      id,
      name,
      type: 'object',
      required: isRequired,
      properties
    }
  }

  return { id, name, type: 'string', required: isRequired }
}

/**
 * Convert a SchemaField tree into a standard JSON Schema object
 */
export function fieldToJsonSchema(
  field: SchemaField,
  strictAdditionalProperties = false
): Record<string, unknown> {
  const schema: Record<string, unknown> = {}

  schema.type = field.type

  if (field.description?.trim()) {
    schema.description = field.description.trim()
  }

  if (field.type === 'string') {
    if (field.format) {
      schema.format = field.format
    }
    if (typeof field.minLength === 'number') {
      schema.minLength = field.minLength
    }
    if (typeof field.maxLength === 'number') {
      schema.maxLength = field.maxLength
    }
    if (field.enum && field.enum.length > 0) {
      schema.enum = field.enum
    }
  }

  if (field.type === 'number' || field.type === 'integer') {
    if (typeof field.minimum === 'number') {
      schema.minimum = field.minimum
    }
    if (typeof field.maximum === 'number') {
      schema.maximum = field.maximum
    }
  }

  if (field.type === 'object') {
    if (field.properties && field.properties.length > 0) {
      const propSchemas: Record<string, unknown> = {}
      const requiredList: string[] = []

      for (const p of field.properties) {
        propSchemas[p.name] = fieldToJsonSchema(p, strictAdditionalProperties)
        if (p.required) {
          requiredList.push(p.name)
        }
      }

      schema.properties = propSchemas
      if (requiredList.length > 0) {
        schema.required = requiredList
      }
    }

    if (strictAdditionalProperties) {
      schema.additionalProperties = false
    }
  }

  if (field.type === 'array') {
    if (field.itemType === 'object' && field.itemProperties && field.itemProperties.length > 0) {
      const itemField: SchemaField = {
        id: 'array_item',
        name: 'item',
        type: 'object',
        required: true,
        properties: field.itemProperties
      }
      schema.items = fieldToJsonSchema(itemField, strictAdditionalProperties)
    } else {
      schema.items = {
        type: field.itemType || 'string'
      }
    }
  }

  return schema
}

const DRAFT_URLS: Record<string, string> = {
  'draft-07': 'http://json-schema.org/draft-07/schema#',
  'draft-2020-12': 'https://json-schema.org/draft/2020-12/schema',
  'draft-04': 'http://json-schema.org/draft-04/schema#'
}

/**
 * Generate complete root JSON Schema
 */
export function buildRootJsonSchema(
  rootField: SchemaField,
  options: SchemaGeneratorOptions
): string {
  const rootSchema: Record<string, unknown> = {
    $schema: DRAFT_URLS[options.draft] ?? DRAFT_URLS['draft-07']
  }

  if (options.title?.trim()) {
    rootSchema.title = options.title.trim()
  }

  if (options.description?.trim()) {
    rootSchema.description = options.description.trim()
  }

  const fieldSchema = fieldToJsonSchema(rootField, options.strictAdditionalProperties)
  Object.assign(rootSchema, fieldSchema)

  return JSON.stringify(rootSchema, null, 2)
}
