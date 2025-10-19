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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Plus, BookOpen } from "lucide-react";
import { useLocation } from "wouter";

export default function Periodicos() {
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [issn, setIssn] = useState("");
  const [area, setArea] = useState("");
  const [qualis, setQualis] = useState("");
  const [descricao, setDescricao] = useState("");

  const utils = trpc.useUtils();
  const { data: periodicos, isLoading } = trpc.periodicos.list.useQuery();

  const createMutation = trpc.periodicos.create.useMutation({
    onSuccess: () => {
      toast.success("Periódico cadastrado com sucesso!");
      utils.periodicos.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar periódico: " + error.message);
    },
  });

  const resetForm = () => {
    setNome("");
    setIssn("");
    setArea("");
    setQualis("");
    setDescricao("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome) {
      toast.error("O nome do periódico é obrigatório");
      return;
    }

    createMutation.mutate({
      nome,
      issn: issn || undefined,
      area: area || undefined,
      qualis: qualis || undefined,
      descricao: descricao || undefined,
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
                <h1 className="text-2xl font-bold text-gray-900">Periódicos</h1>
                <p className="text-sm text-gray-600">Gerencie os periódicos cadastrados</p>
              </div>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Periódico
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : periodicos && periodicos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {periodicos.map((periodico) => (
              <Card
                key={periodico.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setLocation(`/periodicos/${periodico.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{periodico.nome}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {periodico.issn && (
                      <p className="text-sm text-gray-600">ISSN: {periodico.issn}</p>
                    )}
                    {periodico.area && (
                      <p className="text-sm text-gray-600">Área: {periodico.area}</p>
                    )}
                    {periodico.qualis && <Badge variant="secondary">{periodico.qualis}</Badge>}
                    {periodico.descricao && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                        {periodico.descricao}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Nenhum periódico cadastrado</p>
              <Button onClick={() => setDialogOpen(true)}>Cadastrar Primeiro Periódico</Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Dialog de Cadastro */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Periódico</DialogTitle>
            <DialogDescription>Cadastre um novo periódico no sistema</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">
                Nome do Periódico <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                placeholder="Digite o nome completo do periódico"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issn">ISSN</Label>
                <Input
                  id="issn"
                  placeholder="0000-0000"
                  value={issn}
                  onChange={(e) => setIssn(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Área de Conhecimento</Label>
                <Input
                  id="area"
                  placeholder="Ex: Ciência da Computação"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualis">Classificação Qualis</Label>
              <Select value={qualis} onValueChange={setQualis}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a classificação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A1">A1</SelectItem>
                  <SelectItem value="A2">A2</SelectItem>
                  <SelectItem value="B1">B1</SelectItem>
                  <SelectItem value="B2">B2</SelectItem>
                  <SelectItem value="B3">B3</SelectItem>
                  <SelectItem value="B4">B4</SelectItem>
                  <SelectItem value="B5">B5</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição / Escopo Editorial</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o escopo e foco do periódico"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
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

