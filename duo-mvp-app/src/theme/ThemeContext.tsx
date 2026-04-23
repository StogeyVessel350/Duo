import React, { createContext, useContext } from 'react';
import { TOKENS, Theme } from './tokens';

const ThemeContext = createContext<Theme>(TOKENS);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={TOKENS}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
