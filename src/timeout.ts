/** Bricht ein Versprechen nach einer festen Zeit mit einem Fehler ab (verhindert «hängende» Schritte). */
export function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Zeitüberschreitung: ${what} (${Math.round(ms / 1000)} s)`)), ms);
  });
  return Promise.race([p, guard]).finally(() => clearTimeout(timer));
}
