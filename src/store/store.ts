import { configureStore } from "@reduxjs/toolkit";
// Slices will be added as features are migrated
// import loginSliceReducer from "./slices/loginSlice";
// import assignTaskReducer from "./slices/assignTaskSlice";
// etc.

export const store = configureStore({
  reducer: {
    // Reducers will be added incrementally as features are migrated
    // login: loginSliceReducer,
    // assignTask: assignTaskReducer,
    // etc.
    _dummy: (state = {}) => state, // Placeholder to prevent "Store does not have a valid reducer" error
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
  