import type { SchemaField } from '~/types/schema'
import type { CodegenOptions, TargetLanguage } from '~/types/codegen'
import { generateZodSchema } from './zod'
import { generatePydanticModel } from './pydantic'
import { generatePythonDataclass, generatePythonTypedDict } from './python'
import { generateGoStruct } from './go'
import { generateTypeScriptType } from './typescript'

export function generateCode(
  target: TargetLanguage,
  rootField: SchemaField,
  options: CodegenOptions
): string {
  switch (target) {
    case 'zod':
      return generateZodSchema(rootField, options)
    case 'pydantic':
      return generatePydanticModel(rootField, options)
    case 'dataclass':
      return generatePythonDataclass(rootField, options)
    case 'typeddict':
      return generatePythonTypedDict(rootField, options)
    case 'go':
      return generateGoStruct(rootField, options)
    case 'typescript':
      return generateTypeScriptType(rootField, options)
    default:
      return ''
  }
}

export * from './zod'
export * from './pydantic'
export * from './python'
export * from './go'
export * from './typescript'
