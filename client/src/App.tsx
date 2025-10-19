import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import Home from "./pages/Home";
import Login from "./pages/Login";
import SubmissaoDetalhes from "./pages/SubmissaoDetalhes";
import Periodicos from "./pages/Periodicos";
import PeriodicoDetalhes from "./pages/PeriodicoDetalhes";
import Revisoes from "./pages/Revisoes";
import Configuracoes from "./pages/Configuracoes";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {(params) => <ProtectedRoute component={Home} {...params} />}
      </Route>
      <Route path="/submissoes/:id">
        {(params) => <ProtectedRoute component={SubmissaoDetalhes} {...params} />}
      </Route>
      <Route path="/periodicos">
        {(params) => <ProtectedRoute component={Periodicos} {...params} />}
      </Route>
      <Route path="/periodicos/:id">
        {(params) => <ProtectedRoute component={PeriodicoDetalhes} {...params} />}
      </Route>
      <Route path="/revisoes">
        {(params) => <ProtectedRoute component={Revisoes} {...params} />}
      </Route>
      <Route path="/configuracoes">
        {(params) => <ProtectedRoute component={Configuracoes} {...params} />}
      </Route>
      <Route path="/404" component={NotFound} />
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

