import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

// ============= SCHEMAS DE VALIDAÇÃO =============

const createPeriodicoSchema = z.object({
  nome: z.string().min(1),
  issn: z.string().min(1),
  area: z.string().optional(),
  abdc: z.string().optional(),
  abs: z.string().optional(),
  sjr: z.string().optional(),
  jcr: z.string().optional(),
  citeScore: z.string().optional(),
  fatorImpacto: z.string().optional(),
  qualis: z.enum(["muito_bom", "bom", "fraco", "sem_classificacao"]).optional(),
  spell: z.string().optional(),
  scielo: z.string().optional(),
  hIndex: z.string().optional(),
  numeroPalavras: z.number().optional(),
  padraoFormatacao: z.enum(["APA", "NBR6023", "Chicago", "Harvard", "Outra"]).optional(),
  padraoFormatacaoOutra: z.string().optional(),
  descricao: z.string().optional(),
  publisher: z.string().optional(),
});

const autorSchema = z.object({
  nome: z.string().min(1),
  email: z.string().optional(),
  instituicao: z.string().optional(),
  ordem: z.number().default(0),
});

const createSubmissaoSchema = z.object({
  titulo: z.string().min(1),
  resumo: z.string().min(1),
  palavrasChave: z.string().min(1),
  periodicoId: z.string().min(1),
  periodicoSecundarioId: z.string().optional(),
  planoAcao: z.string().optional(),
  autores: z.array(autorSchema),
});

const createRevisaoSchema = z.object({
  submissaoId: z.string().min(1),
  dataRecebimento: z.date(),
  numeroRevisores: z.number().min(1).max(4),
  solicitacaoRevisor1: z.string().optional(),
  respostaRevisor1: z.string().optional(),
  solicitacaoRevisor2: z.string().optional(),
  respostaRevisor2: z.string().optional(),
  solicitacaoRevisor3: z.string().optional(),
  respostaRevisor3: z.string().optional(),
  solicitacaoRevisor4: z.string().optional(),
  respostaRevisor4: z.string().optional(),
  comentarios: z.string().optional(),
  revisorId: z.string().optional(),
});

const updateUserProfileSchema = z.object({
  name: z.string().optional(),
  universidade: z.string().optional(),
  areaFormacao: z.string().optional(),
  nivelFormacao: z.enum(["graduacao", "mestrado", "doutorado", "pos_doutorado"]).optional(),
  universidadeOrigem: z.string().optional(),
  telefone: z.string().optional(),
});

const updateConfiguracaoSchema = z.object({
  llmProvider: z
    .enum(["openai", "gemini", "groq", "deepseek", "qwen", "ollama", "claude", "glm", "grok"])
    .optional(),
  llmApiKey: z.string().optional(),
  llmModel: z.string().optional(),
  llmEnabled: z.boolean().optional(),
});

// ============= ROUTERS =============

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        senha: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.loginUser(input.email, input.senha);
        
        if (!user) {
          return { success: false, message: "Email ou senha incorretos" };
        }
        
        // Criar sessão (cookie)
        const sessionData = {
          userId: user.id,
          email: user.email,
          role: user.role,
        };
        
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, JSON.stringify(sessionData), {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
        });
        
        return { success: true, user };
      }),
    
    register: publicProcedure
      .input(z.object({
        nome: z.string().min(1),
        email: z.string().email(),
        senha: z.string().min(6),
        universidade: z.string().min(1),
        areaFormacao: z.string().min(1),
        nivelFormacao: z.enum(["graduacao", "mestrado", "doutorado", "pos-doutorado"]),
        telefone: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        // Verificar se email já existe
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          return { success: false, message: "Email já cadastrado" };
        }
        
        // Criar usuário
        const userId = await db.createUser({
          nome: input.nome,
          email: input.email,
          senha: input.senha,
          universidade: input.universidade,
          areaFormacao: input.areaFormacao,
          nivelFormacao: input.nivelFormacao,
          telefone: input.telefone,
        });
        
        return { success: true, userId };
      }),
  }),

  // ============= USUÁRIOS =============
  usuarios: router({
    list: publicProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    updateProfile: protectedProcedure
      .input(updateUserProfileSchema)
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ============= DASHBOARD =============
  dashboard: router({
    stats: publicProcedure.query(async () => {
      return await db.getDashboardStats();
    }),

    submissoesRecentes: publicProcedure.input(z.number().default(10)).query(async ({ input }) => {
      const all = await db.getAllSubmissoes();
      return all.slice(0, input);
    }),

    periodicosMaisUtilizados: publicProcedure
      .input(z.number().default(5))
      .query(async ({ input }) => {
        return await db.getPeriodicosMaisUtilizados(input);
      }),
  }),

  // ============= PERIÓDICOS =============
  periodicos: router({
    list: publicProcedure.query(async () => {
      return await db.getAllPeriodicos();
    }),

    getById: publicProcedure.input(z.string()).query(async ({ input }) => {
      return await db.getPeriodicoById(input);
    }),

    search: publicProcedure.input(z.string()).query(async ({ input }) => {
      if (!input || input.length < 2) return [];
      return await db.searchPeriodicos(input);
    }),

    create: protectedProcedure.input(createPeriodicoSchema).mutation(async ({ input }) => {
      await db.createPeriodico(input);
      return { success: true };
    }),

    stats: publicProcedure.input(z.string()).query(async ({ input }) => {
      return await db.getPeriodicoStats(input);
    }),

    submissoes: publicProcedure.input(z.string()).query(async ({ input }) => {
      return await db.getSubmissoesByPeriodico(input);
    }),
  }),

  // ============= SUBMISSÕES =============
  submissoes: router({
    list: publicProcedure.query(async () => {
      return await db.getAllSubmissoes();
    }),

    getById: publicProcedure.input(z.string()).query(async ({ input }) => {
      return await db.getSubmissaoById(input);
    }),

    create: protectedProcedure.input(createSubmissaoSchema).mutation(async ({ ctx, input }) => {
      const submissaoId = crypto.randomUUID();

      await db.createSubmissao({
        id: submissaoId,
        titulo: input.titulo,
        resumo: input.resumo,
        palavrasChave: input.palavrasChave,
        periodicoId: input.periodicoId,
        periodicoSecundarioId: input.periodicoSecundarioId,
        planoAcao: input.planoAcao,
        criadorId: ctx.user.id,
        dataSubmissao: new Date(),
        status: "EM_AVALIACAO",
      });

      const autoresData = input.autores.map((autor, index) => ({
        ...autor,
        submissaoId,
        ordem: index,
      }));

      await db.createAutores(autoresData);

      await db.updateSubmissaoStatus(submissaoId, "EM_AVALIACAO", "Submissão criada");

      return { success: true, id: submissaoId };
    }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.enum([
            "EM_AVALIACAO",
            "APROVADO",
            "REJEITADO",
            "REVISAO_SOLICITADA",
            "SUBMETIDO_NOVAMENTE",
          ]),
          observacao: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateSubmissaoStatus(input.id, input.status, input.observacao);
        return { success: true };
      }),
  }),

  // ============= REVISÕES =============
  revisoes: router({
    list: publicProcedure.query(async () => {
      return await db.getAllRevisoes();
    }),

    create: protectedProcedure.input(createRevisaoSchema).mutation(async ({ ctx, input }) => {
      const revisaoId = crypto.randomUUID();

      await db.createRevisao({
        id: revisaoId,
        ...input,
        revisorId: ctx.user.id,
      });

      // Se LLM estiver habilitada, analisar automaticamente
      const config = await db.getConfiguracao(ctx.user.id);
      if (config?.llmEnabled && config.llmApiKey) {
        try {
          // Construir prompt para análise
          const solicitacoes: string[] = [];
          const respostas: string[] = [];

          for (let i = 1; i <= input.numeroRevisores; i++) {
            const solKey = `solicitacaoRevisor${i}` as keyof typeof input;
            const respKey = `respostaRevisor${i}` as keyof typeof input;

            if (input[solKey]) solicitacoes.push(input[solKey] as string);
            if (input[respKey]) respostas.push(input[respKey] as string);
          }

          if (solicitacoes.length > 0 && respostas.length > 0) {
            const prompt = `Analise se as respostas fornecidas atendem às solicitações dos revisores.

SOLICITAÇÕES DOS REVISORES:
${solicitacoes.map((s, i) => `${i + 1}. ${s}`).join("\n")}

RESPOSTAS FORNECIDAS:
${respostas.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Forneça:
1. Um percentual (0-100) de quanto as respostas atendem às solicitações
2. Sugestões específicas para atender plenamente cada solicitação (sem alucinar, apenas cruzando o que foi feito com o que foi pedido)

Responda em formato JSON:
{
  "percentual": número,
  "sugestoes": "texto com sugestões detalhadas"
}`;

            const llmResponse = await invokeLLM({
              messages: [
                { role: "system", content: "Você é um assistente especializado em análise de revisões acadêmicas." },
                { role: "user", content: prompt },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "analise_revisao",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      percentual: { type: "number" },
                      sugestoes: { type: "string" },
                    },
                    required: ["percentual", "sugestoes"],
                    additionalProperties: false,
                  },
                },
              },
            });

            const content = llmResponse.choices[0].message.content;
            const analise = JSON.parse(typeof content === 'string' ? content : "{}");
            await db.updateRevisaoAnalise(revisaoId, analise.percentual, analise.sugestoes);
          }
        } catch (error) {
          console.error("Erro ao analisar revisão com LLM:", error);
        }
      }

      return { success: true, id: revisaoId };
    }),
  }),

  // ============= CONFIGURAÇÕES =============
  configuracoes: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await db.getConfiguracao(ctx.user.id);
    }),

    update: protectedProcedure.input(updateConfiguracaoSchema).mutation(async ({ ctx, input }) => {
      await db.upsertConfiguracao({
        userId: ctx.user.id,
        ...input,
      });
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;

