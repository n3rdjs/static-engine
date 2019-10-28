function set(object, path, value) {
  if (!isObj(object) || typeof path !== 'string') {
    return object;
  }

  const root = object;
  const pathArray = getPathSegments(path);

  for (let i = 0; i < pathArray.length; i++) {
    const p = pathArray[i];

    if (!isObj(object[p])) {
      object[p] = {};
    }

    if (i === pathArray.length - 1) {
      object[p] = value;
    }

    object = object[p];
  }

  return root;
}