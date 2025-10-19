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
import { ArrowLeft, Plus, FileCheck, Calendar } from "lucide-react";
import { useLocation } from "wouter";

export default function Revisoes() {
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submissaoId, setSubmissaoId] = useState("");
  const [dataRecebimento, setDataRecebimento] = useState("");
  const [numeroRevisores, setNumeroRevisores] = useState("1");
  const [comentarios, setComentarios] = useState("");

  const utils = trpc.useUtils();
  const { data: revisoes, isLoading } = trpc.revisoes.list.useQuery();
  const { data: submissoes } = trpc.submissoes.list.useQuery();

  const createMutation = trpc.revisoes.create.useMutation({
    onSuccess: () => {
      toast.success("Revisão cadastrada com sucesso!");
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
    setComentarios("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!submissaoId || !dataRecebimento || !comentarios) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createMutation.mutate({
      submissaoId,
      dataRecebimento: new Date(dataRecebimento),
      numeroRevisores: parseInt(numeroRevisores),
      comentarios,
    });
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
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Comentários</h4>
                      <p className="text-gray-600 whitespace-pre-wrap">
                        {item.revisao.comentarios}
                      </p>
                    </div>
                    {item.revisor && (
                      <div className="text-sm text-gray-600">
                        Revisor: {item.revisor.name || "N/A"}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Revisão</DialogTitle>
            <DialogDescription>Cadastre uma revisão recebida para uma submissão</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                <Input
                  id="numeroRevisores"
                  type="number"
                  min="1"
                  value={numeroRevisores}
                  onChange={(e) => setNumeroRevisores(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comentarios">
                Comentários dos Revisores <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="comentarios"
                placeholder="Digite os comentários detalhados dos revisores"
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                rows={6}
                required
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

