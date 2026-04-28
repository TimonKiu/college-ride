import { createContext, useContext } from "react";
export const AppContext = createContext(null);
export function useAppCtx() {
  return useContext(AppContext);
}
