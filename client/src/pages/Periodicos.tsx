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
import { QUALIS_LABELS, PADRAO_FORMATACAO_LABELS } from "@/const";

export default function Periodicos() {
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Campos obrigatórios
  const [nome, setNome] = useState("");
  const [issn, setIssn] = useState("");
  
  // Campos opcionais
  const [area, setArea] = useState("");
  const [abdc, setAbdc] = useState("");
  const [abs, setAbs] = useState("");
  const [sjr, setSjr] = useState("");
  const [jcr, setJcr] = useState("");
  const [citeScore, setCiteScore] = useState("");
  const [fatorImpacto, setFatorImpacto] = useState("");
  const [qualis, setQualis] = useState("");
  const [spell, setSpell] = useState("");
  const [scielo, setScielo] = useState("");
  const [hIndex, setHIndex] = useState("");
  const [numeroPalavras, setNumeroPalavras] = useState("");
  const [padraoFormatacao, setPadraoFormatacao] = useState("");
  const [padraoFormatacaoOutra, setPadraoFormatacaoOutra] = useState("");
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
    setAbdc("");
    setAbs("");
    setSjr("");
    setJcr("");
    setCiteScore("");
    setFatorImpacto("");
    setQualis("");
    setSpell("");
    setScielo("");
    setHIndex("");
    setNumeroPalavras("");
    setPadraoFormatacao("");
    setPadraoFormatacaoOutra("");
    setDescricao("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome) {
      toast.error("O nome do periódico é obrigatório");
      return;
    }

    if (!issn) {
      toast.error("O ISSN é obrigatório");
      return;
    }

    createMutation.mutate({
      nome,
      issn,
      area: area || undefined,
      abdc: abdc || undefined,
      abs: abs || undefined,
      sjr: sjr || undefined,
      jcr: jcr || undefined,
      citeScore: citeScore || undefined,
      fatorImpacto: fatorImpacto || undefined,
      qualis: (qualis as any) || undefined,
      spell: spell || undefined,
      scielo: scielo || undefined,
      hIndex: hIndex || undefined,
      numeroPalavras: numeroPalavras ? parseInt(numeroPalavras) : undefined,
      padraoFormatacao: (padraoFormatacao as any) || undefined,
      padraoFormatacaoOutra: padraoFormatacaoOutra || undefined,
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
                    {periodico.qualis && (
                      <Badge variant="secondary">{QUALIS_LABELS[periodico.qualis]}</Badge>
                    )}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Periódico</DialogTitle>
            <DialogDescription>Cadastre um novo periódico no sistema</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campos Obrigatórios */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Informações Obrigatórias</h3>
              
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

              <div className="space-y-2">
                <Label htmlFor="issn">
                  ISSN <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="issn"
                  placeholder="0000-0000"
                  value={issn}
                  onChange={(e) => setIssn(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Classificações */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Classificações (Opcionais)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="abdc">ABDC</Label>
                  <Input id="abdc" value={abdc} onChange={(e) => setAbdc(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="abs">ABS</Label>
                  <Input id="abs" value={abs} onChange={(e) => setAbs(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sjr">SJR</Label>
                  <Input id="sjr" value={sjr} onChange={(e) => setSjr(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jcr">JCR</Label>
                  <Input id="jcr" value={jcr} onChange={(e) => setJcr(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="citeScore">CiteScore</Label>
                  <Input
                    id="citeScore"
                    value={citeScore}
                    onChange={(e) => setCiteScore(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fatorImpacto">Fator de Impacto</Label>
                  <Input
                    id="fatorImpacto"
                    value={fatorImpacto}
                    onChange={(e) => setFatorImpacto(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualis">Qualis</Label>
                  <Select value={qualis} onValueChange={setQualis}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(QUALIS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spell">SPELL</Label>
                  <Input id="spell" value={spell} onChange={(e) => setSpell(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scielo">Scielo</Label>
                  <Input id="scielo" value={scielo} onChange={(e) => setScielo(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hIndex">H Index</Label>
                  <Input id="hIndex" value={hIndex} onChange={(e) => setHIndex(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Formatação */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Formatação (Opcional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numeroPalavras">Número de Palavras</Label>
                  <Input
                    id="numeroPalavras"
                    type="number"
                    value={numeroPalavras}
                    onChange={(e) => setNumeroPalavras(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="padraoFormatacao">Padrão de Formatação</Label>
                  <Select value={padraoFormatacao} onValueChange={setPadraoFormatacao}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PADRAO_FORMATACAO_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {padraoFormatacao === "Outra" && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="padraoFormatacaoOutra">Especifique o Padrão</Label>
                    <Input
                      id="padraoFormatacaoOutra"
                      value={padraoFormatacaoOutra}
                      onChange={(e) => setPadraoFormatacaoOutra(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Outros */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="area">Área de Conhecimento</Label>
                <Input
                  id="area"
                  placeholder="Ex: Ciência da Computação"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
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

