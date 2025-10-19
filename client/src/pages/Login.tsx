import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { GraduationCap, Lock, Mail, User, Building2, Phone } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  
  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  
  // Cadastro
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [universidade, setUniversidade] = useState("");
  const [areaFormacao, setAreaFormacao] = useState("");
  const [nivelFormacao, setNivelFormacao] = useState("graduacao");
  const [telefone, setTelefone] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Login realizado com sucesso!");
        setLocation("/");
      } else {
        toast.error(data.message || "Email ou senha incorretos");
      }
    },
    onError: (error) => {
      toast.error("Erro ao fazer login: " + error.message);
    },
  });

  const cadastroMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Cadastro realizado com sucesso! Faça login para continuar.");
        setLoginEmail(email);
        setLoginSenha(senha);
        // Limpar formulário
        setNome("");
        setEmail("");
        setSenha("");
        setUniversidade("");
        setAreaFormacao("");
        setNivelFormacao("graduacao");
        setTelefone("");
      } else {
        toast.error(data.message || "Erro ao cadastrar");
      }
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar: " + error.message);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginSenha) {
      toast.error("Preencha todos os campos");
      return;
    }
    loginMutation.mutate({ email: loginEmail, senha: loginSenha });
  };

  const handleCadastro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !senha || !universidade || !areaFormacao || !telefone) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    cadastroMutation.mutate({
      nome,
      email,
      senha,
      universidade,
      areaFormacao,
      nivelFormacao: nivelFormacao as "graduacao" | "mestrado" | "doutorado" | "pos-doutorado",
      telefone,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <GraduationCap className="w-16 h-16 text-white" />
            <h1 className="text-4xl font-bold text-white">Sistema de Gestão Acadêmica</h1>
          </div>
          <p className="text-blue-100 text-lg">
            Acompanhe suas submissões e gerencie o fluxo de publicações
          </p>
        </div>

        {/* Card de Login/Cadastro */}
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Bem-vindo</CardTitle>
            <CardDescription className="text-center">
              Faça login ou crie sua conta para começar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
              </TabsList>

              {/* Tab de Login */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-senha">
                      <Lock className="w-4 h-4 inline mr-2" />
                      Senha
                    </Label>
                    <Input
                      id="login-senha"
                      type="password"
                      placeholder="••••••••"
                      value={loginSenha}
                      onChange={(e) => setLoginSenha(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              {/* Tab de Cadastro */}
              <TabsContent value="cadastro">
                <form onSubmit={handleCadastro} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">
                        <User className="w-4 h-4 inline mr-2" />
                        Nome Completo *
                      </Label>
                      <Input
                        id="nome"
                        placeholder="Seu nome completo"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        <Mail className="w-4 h-4 inline mr-2" />
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="senha">
                        <Lock className="w-4 h-4 inline mr-2" />
                        Senha *
                      </Label>
                      <Input
                        id="senha"
                        type="password"
                        placeholder="••••••••"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefone">
                        <Phone className="w-4 h-4 inline mr-2" />
                        Telefone (com DDD) *
                      </Label>
                      <Input
                        id="telefone"
                        placeholder="(11) 98765-4321"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="universidade">
                        <Building2 className="w-4 h-4 inline mr-2" />
                        Universidade de Origem *
                      </Label>
                      <Input
                        id="universidade"
                        placeholder="Nome da universidade"
                        value={universidade}
                        onChange={(e) => setUniversidade(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="areaFormacao">
                        <GraduationCap className="w-4 h-4 inline mr-2" />
                        Área de Formação *
                      </Label>
                      <Input
                        id="areaFormacao"
                        placeholder="Ex: Ciência da Computação"
                        value={areaFormacao}
                        onChange={(e) => setAreaFormacao(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="nivelFormacao">Nível de Formação *</Label>
                      <select
                        id="nivelFormacao"
                        className="w-full p-2 border rounded-md"
                        value={nivelFormacao}
                        onChange={(e) => setNivelFormacao(e.target.value)}
                        required
                      >
                        <option value="graduacao">Graduação</option>
                        <option value="mestrado">Mestrado</option>
                        <option value="doutorado">Doutorado</option>
                        <option value="pos-doutorado">Pós-Doutorado</option>
                      </select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={cadastroMutation.isPending}
                  >
                    {cadastroMutation.isPending ? "Cadastrando..." : "Criar Conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-blue-100 text-sm">
          <p>© 2025 Sistema de Gestão Acadêmica - Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
}

