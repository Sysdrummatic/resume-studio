export function shouldClearLocalDraft({
  yamlContent,
  savedYamlContent,
  storedYamlContent,
  wasDirty,
}: {
  yamlContent: string;
  savedYamlContent: string;
  storedYamlContent?: string;
  wasDirty: boolean;
}): boolean {
  return yamlContent === savedYamlContent && (wasDirty || storedYamlContent === savedYamlContent);
}
