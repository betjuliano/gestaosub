import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import SubmissaoDetalhes from "./pages/SubmissaoDetalhes";
import Periodicos from "./pages/Periodicos";
import PeriodicoDetalhes from "./pages/PeriodicoDetalhes";
import Revisoes from "./pages/Revisoes";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/submissoes/:id"} component={SubmissaoDetalhes} />
      <Route path={"/periodicos"} component={Periodicos} />
      <Route path={"/periodicos/:id"} component={PeriodicoDetalhes} />
      <Route path={"/revisoes"} component={Revisoes} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

