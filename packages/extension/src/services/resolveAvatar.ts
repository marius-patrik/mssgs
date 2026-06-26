export function resolveAvatarUrl(
  avatarMxc: string | null | undefined,
  homeserverUrl: string,
  width = 64,
  height = 64,
): string | null {
  if (!avatarMxc || !homeserverUrl) {
    return null;
  }

  if (avatarMxc.startsWith('mxc://')) {
    const serverAndMediaId = avatarMxc.slice('mxc://'.length);
    const baseUrl = homeserverUrl.replace(/\/$/, '');
    return `${baseUrl}/_matrix/media/v3/thumbnail/${serverAndMediaId}?width=${width}&height=${height}&method=scale`;
  }

  if (avatarMxc.startsWith('http://') || avatarMxc.startsWith('https://')) {
    return avatarMxc;
  }

  return null;
}
