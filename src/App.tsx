import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/her/theme";
import Studio from "@/pages/studio";
import * as db from "@/engine/db";
import { starterFiles } from "@/engine/template";

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => { db.init(() => starterFiles("My App")).finally(() => setReady(true)); }, []);
  return (
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        {ready ? <Studio /> : <div className="h-[100dvh] bg-background" />}
      </TooltipProvider>
    </ThemeProvider>
  );
}
