export function isLocalPreviewLocation(location) {
  return location?.hostname === "127.0.0.1" && String(location?.port || "") === "8765";
}
