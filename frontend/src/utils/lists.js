export function parseList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function listToText(value = []) {
  return value.join(", ");
}
