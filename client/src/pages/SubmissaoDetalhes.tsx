import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { STATUS_LABELS, STATUS_COLORS } from "@/const";
import { ArrowLeft, BookOpen, Users, Calendar, FileText } from "lucide-react";

export default function SubmissaoDetalhes() {
  const [, params] = useRoute("/submissoes/:id");
  const [, setLocation] = useLocation();
  const submissaoId = params?.id || "";

  const { data, isLoading } = trpc.submissoes.getById.useQuery(submissaoId, {
    enabled: !!submissaoId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Submissão não encontrada</p>
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
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Detalhes da Submissão</h1>
            </div>
            <Badge variant="outline" className={STATUS_COLORS[data.submissao.status]}>
              {STATUS_LABELS[data.submissao.status]}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Título</h3>
                  <p className="text-lg font-semibold text-gray-900">{data.submissao.titulo}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Resumo</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{data.submissao.resumo}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Palavras-chave</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.submissao.palavrasChave.split(",").map((palavra, index) => (
                      <Badge key={index} variant="secondary">
                        {palavra.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>

                {data.submissao.planoAcao && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Plano de Ação</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{data.submissao.planoAcao}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Autores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Autores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.autores.map((autor, index) => (
                    <div key={autor.id} className="p-3 border rounded-lg">
                      <div className="font-medium text-gray-900">
                        {index + 1}. {autor.nome}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 space-y-1">
                        {autor.email && <div>Email: {autor.email}</div>}
                        {autor.instituicao && <div>Instituição: {autor.instituicao}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revisões */}
            {data.revisoes && data.revisoes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Revisões Recebidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.revisoes.map((item) => (
                      <div key={item.revisao.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-gray-600">
                            {new Date(item.revisao.dataRecebimento).toLocaleDateString("pt-BR")}
                          </div>
                          <Badge variant="secondary">
                            {item.revisao.numeroRevisores} revisor(es)
                          </Badge>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {item.revisao.comentarios}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Periódico */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Periódico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">{data.periodico?.nome}</h3>
                  {data.periodico?.issn && (
                    <p className="text-sm text-gray-600">ISSN: {data.periodico.issn}</p>
                  )}
                  {data.periodico?.area && (
                    <p className="text-sm text-gray-600">Área: {data.periodico.area}</p>
                  )}
                  {data.periodico?.qualis && (
                    <Badge variant="secondary">{data.periodico.qualis}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informações Adicionais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Data de Submissão</p>
                  <p className="font-medium">
                    {new Date(data.submissao.dataSubmissao).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Criado por</p>
                  <p className="font-medium">{data.criador?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status Atual</p>
                  <Badge variant="outline" className={STATUS_COLORS[data.submissao.status]}>
                    {STATUS_LABELS[data.submissao.status]}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Histórico */}
            {data.historico && data.historico.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Histórico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.historico.map((item) => (
                      <div key={item.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {STATUS_LABELS[item.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(item.data).toLocaleString("pt-BR")}
                        </p>
                        {item.observacao && (
                          <p className="text-xs text-gray-600 mt-1">{item.observacao}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

