export type JsonSchemaType
  = 'string'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'object'
    | 'array'
    | 'null'

export type StringFormat
  = ''
    | 'date-time'
    | 'date'
    | 'email'
    | 'uri'
    | 'uuid'
    | 'ipv4'
    | 'hostname'

export interface SchemaField {
  id: string
  name: string
  type: JsonSchemaType
  required: boolean
  description?: string
  format?: StringFormat
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  enum?: string[]
  // When type === 'object'
  properties?: SchemaField[]
  // When type === 'array'
  itemType?: JsonSchemaType
  itemProperties?: SchemaField[] // When array item is object
}

export type SchemaDraft = 'draft-07' | 'draft-2020-12' | 'draft-04'

export interface SchemaGeneratorOptions {
  draft: SchemaDraft
  title?: string
  description?: string
  strictAdditionalProperties?: boolean
}
