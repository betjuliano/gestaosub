import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Settings, Bot } from "lucide-react";
import { useLocation } from "wouter";
import { LLM_PROVIDERS } from "@/const";

export default function Configuracoes() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [llmProvider, setLlmProvider] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmEnabled, setLlmEnabled] = useState(false);

  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.configuracoes.get.useQuery(undefined, {
    enabled: !!user,
  });

  const updateMutation = trpc.configuracoes.update.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      utils.configuracoes.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao salvar configurações: " + error.message);
    },
  });

  useEffect(() => {
    if (config) {
      setLlmProvider(config.llmProvider || "");
      setLlmApiKey(config.llmApiKey || "");
      setLlmModel(config.llmModel || "");
      setLlmEnabled(config.llmEnabled || false);
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateMutation.mutate({
      llmProvider: llmProvider as any,
      llmApiKey: llmApiKey || undefined,
      llmModel: llmModel || undefined,
      llmEnabled,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Você precisa estar autenticado</p>
          <Button className="mt-4" onClick={() => setLocation("/")}>
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6" />
              <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-4xl">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Configurações de LLM */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Análise Automática com LLM
                </CardTitle>
                <CardDescription>
                  Configure uma API de LLM para análise automática das revisões recebidas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Habilitar Análise Automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Analisa automaticamente se as respostas atendem às solicitações dos revisores
                    </p>
                  </div>
                  <Switch checked={llmEnabled} onCheckedChange={setLlmEnabled} />
                </div>

                {llmEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="llmProvider">Provedor de LLM</Label>
                      <Select value={llmProvider} onValueChange={setLlmProvider}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o provedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(LLM_PROVIDERS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="llmApiKey">API Key</Label>
                      <Input
                        id="llmApiKey"
                        type="password"
                        placeholder="sk-..."
                        value={llmApiKey}
                        onChange={(e) => setLlmApiKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Sua chave de API será armazenada de forma segura
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="llmModel">Modelo (opcional)</Label>
                      <Input
                        id="llmModel"
                        placeholder="Ex: gpt-4, gemini-pro, etc."
                        value={llmModel}
                        onChange={(e) => setLlmModel(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Deixe em branco para usar o modelo padrão
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Botões de Ação */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/")}
                disabled={updateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

