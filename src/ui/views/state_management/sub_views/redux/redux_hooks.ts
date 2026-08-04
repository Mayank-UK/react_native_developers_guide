import { useDispatch, useSelector, Provider as ReduxProvider } from 'react-redux';
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Redux Toolkit view logic — a single scoped demo store + slice + the
 * selector/dispatch hooks. The store is SCOPED to this view's demo subtree via
 * a <Provider> — the app itself is NOT a Redux app (see the decision log: "State
 * libs added for the state-management teaching screen"). No `any`; strict +
 * erasableSyntaxOnly-clean.
 */

export interface ReduxCounterState {
  count: number;
}

export const reduxCounterSlice = createSlice({
  name: 'demoCounter',
  initialState: { count: 0 } as ReduxCounterState,
  reducers: {
    incremented(state) {
      state.count += 1; // RTK uses Immer; "mutating" this is safe + immutable
    },
    decremented(state) {
      state.count -= 1;
    },
    addedBy(state, action: PayloadAction<number>) {
      state.count += action.payload;
    },
  },
});

export const { incremented, decremented, addedBy } = reduxCounterSlice.actions;

/**
 * The store is SCOPED to this view's demo subtree via a <Provider> — we do NOT
 * add it to _layout (this app is not a Redux app).
 */
export const demoStore = configureStore({
  reducer: { demoCounter: reduxCounterSlice.reducer },
});
export type DemoRootState = ReturnType<typeof demoStore.getState>;
export type DemoDispatch = typeof demoStore.dispatch;

export interface ReduxCountDisplay {
  count: number;
}

/** Reads the scoped Redux store via useSelector. */
export function useReduxCountDisplay(): ReduxCountDisplay {
  const count = useSelector((s: DemoRootState) => s.demoCounter.count);
  return { count };
}

export interface ReduxControls {
  increment: () => void;
  decrement: () => void;
  addBy5: () => void;
}

export function useReduxControls(): ReduxControls {
  const dispatch = useDispatch<DemoDispatch>();
  return {
    increment: () => dispatch(incremented()),
    decrement: () => dispatch(decremented()),
    addBy5: () => dispatch(addedBy(5)),
  };
}

// Re-export so the view can wrap the demo subtree without importing react-redux
// directly (keeps the provider wiring alongside the store it owns).
export { ReduxProvider };
