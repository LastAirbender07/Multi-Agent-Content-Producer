import { configureStore } from "@reduxjs/toolkit";
import pipelineReducer from "./slices/pipelineSlice";
import chatReducer from "./slices/chatSlice";
import historyReducer from "./slices/historySlice";

export const store = configureStore({
  reducer: {
    pipeline: pipelineReducer,
    chat: chatReducer,
    history: historyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
