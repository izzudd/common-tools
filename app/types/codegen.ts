export type TargetLanguage = 'zod' | 'pydantic' | 'dataclass' | 'typeddict' | 'go' | 'typescript'

export interface CodegenOptions {
  rootName: string
  // Zod options
  zodInferType?: boolean
  zodCoerce?: boolean
  // Python options
  pythonOptionalUnion?: boolean // Python 3.10+ (T | None) vs Optional[T]
  pydanticVersion?: 'v2' | 'v1'
  pythonSnakeCase?: boolean // convert field names to snake_case with Field(alias=...)
  // Go options
  goOmitEmpty?: boolean
  goPointerOptional?: boolean
  // TypeScript options
  tsTypeOrInterface?: 'interface' | 'type'
  tsReadonly?: boolean
}

// Helpers for naming and casing
export function toPascalCase(str: string): string {
  if (!str) return 'Root'
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, c => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '') || 'Root'
}

export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

export function toSnakeCase(str: string): string {
  if (!str) return 'field'
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'field'
}

export function isValidIdentifier(str: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str)
}
