export interface ToolItem {
  id: string
  name: string
  description: string
  path: string
  icon: string
  badge?: string
  keywords: string[]
}

export interface ToolCategory {
  id: string
  name: string
  description: string
  icon: string
  tools: ToolItem[]
}
