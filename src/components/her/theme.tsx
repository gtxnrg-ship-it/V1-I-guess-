import { createContext, useContext, useEffect, type ReactNode } from "react";

/** Kuro-chan uses one intentional dark galaxy theme. Keeping this provider stable
 * prevents the system light preference from fighting the app's dark design tokens. */
type Theme = "dark";
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
    return () => { document.documentElement.style.colorScheme = ""; };
  }, []);
  return <Ctx.Provider value={{ theme: "dark", toggle: () => {} }}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);
