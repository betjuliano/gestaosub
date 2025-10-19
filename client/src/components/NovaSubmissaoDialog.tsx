import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

interface NovaSubmissaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Autor {
  nome: string;
  email: string;
  instituicao: string;
  ordem: number;
}

export default function NovaSubmissaoDialog({ open, onOpenChange }: NovaSubmissaoDialogProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [titulo, setTitulo] = useState("");
  const [resumo, setResumo] = useState("");
  const [palavrasChave, setPalavrasChave] = useState("");
  const [periodicoId, setPeriodicoId] = useState("");
  const [periodicoSecundarioId, setPeriodicoSecundarioId] = useState("");
  const [planoAcao, setPlanoAcao] = useState("");
  const [showNovoPeriodico, setShowNovoPeriodico] = useState(false);
  const [autores, setAutores] = useState<Autor[]>([
    { nome: "", email: "", instituicao: "", ordem: 0 },
  ]);

  const { data: periodicos } = trpc.periodicos.list.useQuery();

  const createMutation = trpc.submissoes.create.useMutation({
    onSuccess: () => {
      toast.success("Submissão criada com sucesso!");
      utils.dashboard.invalidate();
      utils.submissoes.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao criar submissão: " + error.message);
    },
  });

  const resetForm = () => {
    setTitulo("");
    setResumo("");
    setPalavrasChave("");
    setPeriodicoId("");
    setPeriodicoSecundarioId("");
    setPlanoAcao("");
    setShowNovoPeriodico(false);
    setAutores([{ nome: "", email: "", instituicao: "", ordem: 0 }]);
  };

  const handleAddAutor = () => {
    setAutores([...autores, { nome: "", email: "", instituicao: "", ordem: autores.length }]);
  };

  const handleRemoveAutor = (index: number) => {
    if (autores.length > 1) {
      setAutores(autores.filter((_, i) => i !== index));
    }
  };

  const handleAutorChange = (index: number, field: keyof Autor, value: string) => {
    const newAutores = [...autores];
    newAutores[index] = { ...newAutores[index], [field]: value };
    setAutores(newAutores);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Você precisa estar autenticado");
      return;
    }

    if (!titulo || !resumo || !palavrasChave || !periodicoId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const autoresValidos = autores.filter((a) => a.nome.trim() !== "");
    if (autoresValidos.length === 0) {
      toast.error("Adicione pelo menos um autor");
      return;
    }

    createMutation.mutate({
      titulo,
      resumo,
      palavrasChave,
      periodicoId,
      periodicoSecundarioId: periodicoSecundarioId || undefined,
      planoAcao: planoAcao || undefined,
      autores: autoresValidos,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Submissão</DialogTitle>
          <DialogDescription>
            Preencha os dados para submeter seu artigo a um periódico
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Informações Básicas</h3>

            <div className="space-y-2">
              <Label htmlFor="titulo">
                Título do Artigo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="titulo"
                placeholder="Digite o título do artigo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="periodico">
                  Periódico Principal <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => window.open("/periodicos", "_blank")}
                >
                  + Cadastrar Novo Periódico
                </Button>
              </div>
              <Select value={periodicoId} onValueChange={setPeriodicoId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um periódico cadastrado" />
                </SelectTrigger>
                <SelectContent>
                  {periodicos?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecione o periódico principal onde deseja submeter
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodicoSecundario">Periódico Secundário (Opcional)</Label>
              <Select
                value={periodicoSecundarioId}
                onValueChange={setPeriodicoSecundarioId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um periódico alternativo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {periodicos?.filter((p) => p.id !== periodicoId).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Caso seja rejeitado no periódico principal, submeter neste
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resumo">
                Resumo <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="resumo"
                placeholder="Digite o resumo do artigo"
                value={resumo}
                onChange={(e) => setResumo(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="palavrasChave">
                Palavras-chave <span className="text-red-500">*</span>
              </Label>
              <Input
                id="palavrasChave"
                placeholder="Separe as palavras-chave por vírgula"
                value={palavrasChave}
                onChange={(e) => setPalavrasChave(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Ex: metodologia científica, pesquisa qualitativa, análise de dados
              </p>
            </div>
          </div>

          {/* Autores */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Autores</h3>
              <Button type="button" variant="outline" size="sm" onClick={handleAddAutor}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Autor
              </Button>
            </div>

            {autores.map((autor, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                {autores.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => handleRemoveAutor(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>
                      Nome <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Nome do autor"
                      value={autor.nome}
                      onChange={(e) => handleAutorChange(index, "nome", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={autor.email}
                      onChange={(e) => handleAutorChange(index, "email", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Instituição</Label>
                    <Input
                      placeholder="Nome da instituição"
                      value={autor.instituicao}
                      onChange={(e) => handleAutorChange(index, "instituicao", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Plano de Ação */}
          <div className="space-y-2">
            <Label htmlFor="planoAcao">Plano de Ação</Label>
            <Textarea
              id="planoAcao"
              placeholder="Descreva sua estratégia de submissão, cronograma, etc."
              value={planoAcao}
              onChange={(e) => setPlanoAcao(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Submissão"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

