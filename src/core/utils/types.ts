/**
 * Compile-time exhaustiveness check for discriminated unions.
 *
 * In a `switch` over a tagged union, route the `default` branch through this so
 * that adding a new variant becomes a type error everywhere the union isn't
 * fully handled:
 *
 *   switch (action.type) {
 *     case 'a': ...
 *     default: return assertNever(action);
 *   }
 *
 * The `assertNever` util already lives in `ts_js_fundamentals_view.tsx` as a
 * teaching example; this is the real one used in app logic.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminated-union member: ${JSON.stringify(value)}`);
}
