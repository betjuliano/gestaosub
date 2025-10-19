import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Plus, FileCheck, Calendar, Bot, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

export default function Revisoes() {
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submissaoId, setSubmissaoId] = useState("");
  const [dataRecebimento, setDataRecebimento] = useState("");
  const [numeroRevisores, setNumeroRevisores] = useState("1");
  
  // Campos para cada revisor
  const [solicitacaoRevisor1, setSolicitacaoRevisor1] = useState("");
  const [respostaRevisor1, setRespostaRevisor1] = useState("");
  const [solicitacaoRevisor2, setSolicitacaoRevisor2] = useState("");
  const [respostaRevisor2, setRespostaRevisor2] = useState("");
  const [solicitacaoRevisor3, setSolicitacaoRevisor3] = useState("");
  const [respostaRevisor3, setRespostaRevisor3] = useState("");
  const [solicitacaoRevisor4, setSolicitacaoRevisor4] = useState("");
  const [respostaRevisor4, setRespostaRevisor4] = useState("");
  
  const [comentarios, setComentarios] = useState("");

  const utils = trpc.useUtils();
  const { data: revisoes, isLoading } = trpc.revisoes.list.useQuery();
  const { data: submissoes } = trpc.submissoes.list.useQuery();

  const createMutation = trpc.revisoes.create.useMutation({
    onSuccess: () => {
      toast.success("Revisão cadastrada com sucesso! A análise automática será processada.");
      utils.revisoes.invalidate();
      utils.submissoes.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar revisão: " + error.message);
    },
  });

  const resetForm = () => {
    setSubmissaoId("");
    setDataRecebimento("");
    setNumeroRevisores("1");
    setSolicitacaoRevisor1("");
    setRespostaRevisor1("");
    setSolicitacaoRevisor2("");
    setRespostaRevisor2("");
    setSolicitacaoRevisor3("");
    setRespostaRevisor3("");
    setSolicitacaoRevisor4("");
    setRespostaRevisor4("");
    setComentarios("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!submissaoId || !dataRecebimento) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const numRevisores = parseInt(numeroRevisores);

    createMutation.mutate({
      submissaoId,
      dataRecebimento: new Date(dataRecebimento),
      numeroRevisores: numRevisores,
      solicitacaoRevisor1: solicitacaoRevisor1 || undefined,
      respostaRevisor1: respostaRevisor1 || undefined,
      solicitacaoRevisor2: numRevisores >= 2 ? solicitacaoRevisor2 || undefined : undefined,
      respostaRevisor2: numRevisores >= 2 ? respostaRevisor2 || undefined : undefined,
      solicitacaoRevisor3: numRevisores >= 3 ? solicitacaoRevisor3 || undefined : undefined,
      respostaRevisor3: numRevisores >= 3 ? respostaRevisor3 || undefined : undefined,
      solicitacaoRevisor4: numRevisores >= 4 ? solicitacaoRevisor4 || undefined : undefined,
      respostaRevisor4: numRevisores >= 4 ? respostaRevisor4 || undefined : undefined,
      comentarios: comentarios || undefined,
    });
  };

  const renderRevisorFields = (numero: number) => {
    const numRevisores = parseInt(numeroRevisores);
    if (numero > numRevisores) return null;

    const solicitacaoValue = 
      numero === 1 ? solicitacaoRevisor1 :
      numero === 2 ? solicitacaoRevisor2 :
      numero === 3 ? solicitacaoRevisor3 :
      solicitacaoRevisor4;

    const respostaValue = 
      numero === 1 ? respostaRevisor1 :
      numero === 2 ? respostaRevisor2 :
      numero === 3 ? respostaRevisor3 :
      respostaRevisor4;

    const setSolicitacao = 
      numero === 1 ? setSolicitacaoRevisor1 :
      numero === 2 ? setSolicitacaoRevisor2 :
      numero === 3 ? setSolicitacaoRevisor3 :
      setSolicitacaoRevisor4;

    const setResposta = 
      numero === 1 ? setRespostaRevisor1 :
      numero === 2 ? setRespostaRevisor2 :
      numero === 3 ? setRespostaRevisor3 :
      setRespostaRevisor4;

    return (
      <div key={numero} className="p-4 border rounded-lg space-y-3 bg-gray-50">
        <h4 className="font-semibold text-gray-900">Revisor {numero}</h4>
        
        <div className="space-y-2">
          <Label htmlFor={`solicitacao${numero}`}>Solicitação do Revisor</Label>
          <Textarea
            id={`solicitacao${numero}`}
            placeholder="O que o revisor solicitou..."
            value={solicitacaoValue}
            onChange={(e) => setSolicitacao(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`resposta${numero}`}>Resposta Fornecida</Label>
          <Textarea
            id={`resposta${numero}`}
            placeholder="Como você respondeu à solicitação..."
            value={respostaValue}
            onChange={(e) => setResposta(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Revisões</h1>
                <p className="text-sm text-gray-600">Gerencie as revisões recebidas</p>
              </div>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Revisão
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : revisoes && revisoes.length > 0 ? (
          <div className="space-y-4">
            {revisoes.map((item) => (
              <Card key={item.revisao.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {item.submissao?.titulo || "Submissão não encontrada"}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(item.revisao.dataRecebimento).toLocaleDateString("pt-BR")}
                        </span>
                        <Badge variant="secondary">
                          {item.revisao.numeroRevisores} revisor(es)
                        </Badge>
                      </div>
                    </div>
                    {item.revisao.analisePercentual !== null && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-blue-700">
                          {item.revisao.analisePercentual}% atendido
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Revisores */}
                    {[1, 2, 3, 4].map((num) => {
                      const solKey = `solicitacaoRevisor${num}` as keyof typeof item.revisao;
                      const respKey = `respostaRevisor${num}` as keyof typeof item.revisao;
                      const solicitacao = item.revisao[solKey] as string | null | undefined;
                      const resposta = item.revisao[respKey] as string | null | undefined;

                      if (!solicitacao && !resposta) return null;

                      return (
                        <div key={num} className="p-3 border rounded-lg bg-gray-50">
                          <h5 className="font-medium text-gray-900 mb-2">Revisor {num}</h5>
                          {solicitacao && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-500 mb-1">Solicitação:</p>
                              <p className="text-sm text-gray-700">{solicitacao}</p>
                            </div>
                          )}
                          {resposta && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Resposta:</p>
                              <p className="text-sm text-gray-700">{resposta}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Análise LLM */}
                    {item.revisao.sugestoesLLM && (
                      <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-5 h-5 text-blue-600" />
                          <h5 className="font-semibold text-blue-900">Análise Automática</h5>
                        </div>
                        <p className="text-sm text-blue-800 whitespace-pre-wrap">
                          {item.revisao.sugestoesLLM}
                        </p>
                      </div>
                    )}

                    {/* Comentários Gerais */}
                    {item.revisao.comentarios && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">
                          Comentários Gerais
                        </h5>
                        <p className="text-gray-600 whitespace-pre-wrap">
                          {item.revisao.comentarios}
                        </p>
                      </div>
                    )}

                    {item.revisor && (
                      <div className="text-sm text-gray-600 pt-2 border-t">
                        Cadastrado por: {item.revisor.name || "N/A"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FileCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Nenhuma revisão cadastrada</p>
              <Button onClick={() => setDialogOpen(true)}>Cadastrar Primeira Revisão</Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Dialog de Cadastro */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Revisão</DialogTitle>
            <DialogDescription>
              Cadastre uma revisão recebida para uma submissão. Se configurado, a análise
              automática será realizada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="submissao">
                  Submissão <span className="text-red-500">*</span>
                </Label>
                <select
                  id="submissao"
                  className="w-full p-2 border rounded-md"
                  value={submissaoId}
                  onChange={(e) => setSubmissaoId(e.target.value)}
                  required
                >
                  <option value="">Selecione uma submissão</option>
                  {submissoes?.map((item) => (
                    <option key={item.submissao.id} value={item.submissao.id}>
                      {item.submissao.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataRecebimento">
                    Data de Recebimento <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dataRecebimento"
                    type="date"
                    value={dataRecebimento}
                    onChange={(e) => setDataRecebimento(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeroRevisores">
                    Número de Revisores <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="numeroRevisores"
                    className="w-full p-2 border rounded-md"
                    value={numeroRevisores}
                    onChange={(e) => setNumeroRevisores(e.target.value)}
                    required
                  >
                    <option value="1">1 Revisor</option>
                    <option value="2">2 Revisores</option>
                    <option value="3">3 Revisores</option>
                    <option value="4">4 Revisores</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Campos dos Revisores */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">Solicitações e Respostas</h3>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  <Bot className="w-3 h-3 mr-1" />
                  Análise automática habilitada
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Preencha as solicitações e respostas de cada revisor para análise automática
              </p>

              <div className="space-y-3">
                {renderRevisorFields(1)}
                {renderRevisorFields(2)}
                {renderRevisorFields(3)}
                {renderRevisorFields(4)}
              </div>
            </div>

            {/* Comentários Gerais */}
            <div className="space-y-2">
              <Label htmlFor="comentarios">Comentários Gerais (Opcional)</Label>
              <Textarea
                id="comentarios"
                placeholder="Comentários adicionais sobre a revisão"
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

