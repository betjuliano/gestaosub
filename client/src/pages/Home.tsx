import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { APP_TITLE, STATUS_LABELS, STATUS_COLORS } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  BookOpen,
  Users,
  FileCheck,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import NovaSubmissaoDialog from "@/components/NovaSubmissaoDialog";
import PesquisarPeriodicoDialog from "@/components/PesquisarPeriodicoDialog";
import GerenciarUsuariosDialog from "@/components/GerenciarUsuariosDialog";

export default function Home() {
  const { user, loading } = useAuth();
  const [novaSubmissaoOpen, setNovaSubmissaoOpen] = useState(false);
  const [pesquisarPeriodicoOpen, setPesquisarPeriodicoOpen] = useState(false);
  const [gerenciarUsuariosOpen, setGerenciarUsuariosOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("recentes");

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: submissoesRecentes, isLoading: submissoesLoading } =
    trpc.dashboard.submissoesRecentes.useQuery(10);
  const { data: periodicosMaisUtilizados } = trpc.dashboard.periodicosMaisUtilizados.useQuery(5);

  if (loading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-700">{APP_TITLE}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Acompanhe suas submissões e gerencie o fluxo de publicações
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPesquisarPeriodicoOpen(true)}
              >
                <Search className="w-4 h-4 mr-2" />
                Pesquisar Periódico
              </Button>
              <Button variant="outline" size="sm" onClick={() => setGerenciarUsuariosOpen(true)}>
                <Users className="w-4 h-4 mr-2" />
                Usuário
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/periodicos">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Periódico
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/revisoes">
                  <FileCheck className="w-4 h-4 mr-2" />
                  Revisões
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLocation("/configuracoes")}>
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>
              <Button onClick={() => setNovaSubmissaoOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Submissão
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats?.totalSubmissoes || 0}</div>
              <p className="text-xs text-gray-500 mt-1">submissões</p>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-yellow-600">Em Avaliação</CardTitle>
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats?.emAvaliacao || 0}</div>
              <p className="text-xs text-yellow-600 mt-1">aguardando parecer</p>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-green-600">Aprovadas</CardTitle>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats?.aprovadas || 0}</div>
              <p className="text-xs text-green-600 mt-1">aceitas para publicação</p>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-red-600">Rejeitadas</CardTitle>
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats?.rejeitadas || 0}</div>
              <p className="text-xs text-red-600 mt-1">não aceitas</p>
            </CardContent>
          </Card>

          <Card className="bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-blue-600">Revisão</CardTitle>
                <AlertCircle className="w-5 h-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats?.revisaoSolicitada || 0}
              </div>
              <p className="text-xs text-blue-600 mt-1">precisam de ajustes</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border">
            <TabsTrigger value="recentes">Submissões Recentes</TabsTrigger>
            <TabsTrigger value="periodicos">Periódicos</TabsTrigger>
            <TabsTrigger value="alertas">Alertas de Prazo</TabsTrigger>
          </TabsList>

          <TabsContent value="recentes" className="space-y-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Submissões Recentes</CardTitle>
                <CardDescription>
                  Acompanhe o status das suas submissões mais recentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissoesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : submissoesRecentes && submissoesRecentes.length > 0 ? (
                  <div className="space-y-3">
                    {submissoesRecentes.map((item) => (
                      <Link
                        key={item.submissao.id}
                        href={`/submissoes/${item.submissao.id}`}
                        className="block"
                      >
                        <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {item.submissao.titulo}
                              </h3>
                              <div className="flex items-center gap-3 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-4 h-4" />
                                  {item.periodico?.nome || "N/A"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {item.criador?.name || "N/A"}
                                </span>
                                <span>
                                  {new Date(item.submissao.dataSubmissao).toLocaleDateString(
                                    "pt-BR"
                                  )}
                                </span>
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
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Nenhuma submissão encontrada</p>
                    <Button onClick={() => setNovaSubmissaoOpen(true)}>
                      Criar Primeira Submissão
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="periodicos" className="space-y-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Periódicos Mais Utilizados</CardTitle>
                <CardDescription>
                  Periódicos com maior número de submissões no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {periodicosMaisUtilizados && periodicosMaisUtilizados.length > 0 ? (
                  <div className="space-y-3">
                    {periodicosMaisUtilizados.map((item) => (
                      <Link
                        key={item.periodico.id}
                        href={`/periodicos/${item.periodico.id}`}
                        className="block"
                      >
                        <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">
                                {item.periodico.nome}
                              </h3>
                              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                {item.periodico.issn && <span>ISSN: {item.periodico.issn}</span>}
                                {item.periodico.area && <span>{item.periodico.area}</span>}
                                {item.periodico.qualis && (
                                  <Badge variant="secondary">{item.periodico.qualis}</Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">
                                {Number(item.totalSubmissoes)}
                              </div>
                              <div className="text-xs text-gray-500">submissões</div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum periódico cadastrado ainda</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alertas" className="space-y-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Alertas de Prazo</CardTitle>
                <CardDescription>Submissões com prazos próximos do vencimento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Funcionalidade em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="container py-4 text-center text-sm text-gray-500">
          Sistema integrado via iframe • Última atividade:{" "}
          {new Date().toLocaleString("pt-BR")}
        </div>
      </footer>

      {/* Dialogs */}
      <NovaSubmissaoDialog open={novaSubmissaoOpen} onOpenChange={setNovaSubmissaoOpen} />
      <PesquisarPeriodicoDialog
        open={pesquisarPeriodicoOpen}
        onOpenChange={setPesquisarPeriodicoOpen}
      />
      <GerenciarUsuariosDialog
        open={gerenciarUsuariosOpen}
        onOpenChange={setGerenciarUsuariosOpen}
      />
    </div>
  );
}

