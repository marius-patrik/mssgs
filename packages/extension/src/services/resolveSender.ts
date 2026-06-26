export function resolveSenderName(senderId: string, displayName?: string | null): string {
  if (displayName) {
    return displayName;
  }

  const withoutLeadingAt = senderId.startsWith('@') ? senderId.slice(1) : senderId;
  return withoutLeadingAt.split(':')[0] ?? withoutLeadingAt;
}

export function resolveSenderInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
