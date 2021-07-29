export default function formatPatId(patId) {
  if (patId && patId.includes('-')) {
    const parts = patId.split('-');
    if (parts.length > 1) {
      let newId = '';
      for (let i = 1; i < parts.length - 1; ++i) {
        newId += parts[i];
        if (i < parts.length - 2) {
          newId += '-';
        }
      }
      return newId;
    }
  }

  return patId;
}
