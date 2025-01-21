export const ComponentType = {
  ASSISTANT: "ASSISTANT",
  KNOWLEDGE_SOURCE: "KNOWLEDGE_SOURCE",
  LLM_CONNECTION: "LLM_CONNECTION",
} as const;

export type ComponentType = typeof ComponentType[keyof typeof ComponentType];
