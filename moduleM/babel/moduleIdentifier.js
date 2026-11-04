// Stable in Node and browsers; Babel reserves names to avoid collisions.
function moduleIdentifier(path, source) {
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619) >>> 0;
  return path.scope.generateUidIdentifier('module_' + hash.toString(16)).name;
}
module.exports = moduleIdentifier;
