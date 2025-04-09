export function createSub(sub: any) {
  let s = sub;
  const unsubscribe = () => {
    if (s) {
      s.unsubscribe();
      s = null;
    }
  };
  return {
    sub(newSub: any) {
      unsubscribe();
      s = newSub;
    },
    unsubscribe,
  };
}
