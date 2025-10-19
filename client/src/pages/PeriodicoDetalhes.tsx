import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { STATUS_LABELS, STATUS_COLORS } from "@/const";
import { ArrowLeft, BookOpen, FileText, TrendingUp } from "lucide-react";

export default function PeriodicoDetalhes() {
  const [, params] = useRoute("/periodicos/:id");
  const [, setLocation] = useLocation();
  const periodicoId = params?.id || "";

  const { data: periodico, isLoading: periodicoLoading } = trpc.periodicos.getById.useQuery(
    periodicoId,
    {
      enabled: !!periodicoId,
    }
  );

  const { data: stats, isLoading: statsLoading } = trpc.periodicos.stats.useQuery(periodicoId, {
    enabled: !!periodicoId,
  });

  const { data: submissoes, isLoading: submissoesLoading } = trpc.periodicos.submissoes.useQuery(
    periodicoId,
    {
      enabled: !!periodicoId,
    }
  );

  if (periodicoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!periodico) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Periódico não encontrado</p>
          <Button className="mt-4" onClick={() => setLocation("/periodicos")}>
            Voltar aos Periódicos
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
            <Button variant="ghost" size="sm" onClick={() => setLocation("/periodicos")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{periodico.nome}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                {periodico.issn && <span>ISSN: {periodico.issn}</span>}
                {periodico.area && <span>{periodico.area}</span>}
              </div>
            </div>
            {periodico.qualis && <Badge variant="secondary">{periodico.qualis}</Badge>}
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Descrição */}
            {periodico.descricao && (
              <Card>
                <CardHeader>
                  <CardTitle>Descrição</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{periodico.descricao}</p>
                </CardContent>
              </Card>
            )}

            {/* Submissões */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Submissões para este Periódico
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submissoesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : submissoes && submissoes.length > 0 ? (
                  <div className="space-y-3">
                    {submissoes.map((item) => (
                      <div
                        key={item.submissao.id}
                        onClick={() => setLocation(`/submissoes/${item.submissao.id}`)}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {item.submissao.titulo}
                            </h3>
                            <div className="text-sm text-gray-600">
                              <span>
                                {new Date(item.submissao.dataSubmissao).toLocaleDateString("pt-BR")}
                              </span>
                              {item.criador && <span> • {item.criador.name}</span>}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={STATUS_COLORS[item.submissao.status]}
                          >
                            {STATUS_LABELS[item.submissao.status]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhuma submissão para este periódico ainda</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Estatísticas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total de Submissões</span>
                      <span className="font-bold text-lg">{stats?.total || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-yellow-600">Em Avaliação</span>
                      <span className="font-bold text-yellow-600">{stats?.emAvaliacao || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-600">Aprovadas</span>
                      <span className="font-bold text-green-600">{stats?.aprovadas || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-red-600">Rejeitadas</span>
                      <span className="font-bold text-red-600">{stats?.rejeitadas || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-600">Revisão Solicitada</span>
                      <span className="font-bold text-blue-600">
                        {stats?.revisaoSolicitada || 0}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informações Adicionais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {periodico.issn && (
                  <div>
                    <p className="text-sm text-gray-500">ISSN</p>
                    <p className="font-medium">{periodico.issn}</p>
                  </div>
                )}
                {periodico.area && (
                  <div>
                    <p className="text-sm text-gray-500">Área</p>
                    <p className="font-medium">{periodico.area}</p>
                  </div>
                )}
                {periodico.qualis && (
                  <div>
                    <p className="text-sm text-gray-500">Qualis</p>
                    <Badge variant="secondary">{periodico.qualis}</Badge>
                  </div>
                )}
                {periodico.publisher && (
                  <div>
                    <p className="text-sm text-gray-500">Editora</p>
                    <p className="font-medium">{periodico.publisher}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

