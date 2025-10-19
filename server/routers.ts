import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

// ============= SCHEMAS DE VALIDAÇÃO =============

const createPeriodicoSchema = z.object({
  nome: z.string().min(1),
  issn: z.string().optional(),
  area: z.string().optional(),
  qualis: z.string().optional(),
  descricao: z.string().optional(),
  abdc: z.string().optional(),
  abs: z.string().optional(),
  sjrQuartile: z.string().optional(),
  sjrScore: z.string().optional(),
  jcrQuartile: z.string().optional(),
  jcrImpactFactor: z.string().optional(),
  publisher: z.string().optional(),
});

const autorSchema = z.object({
  nome: z.string().min(1),
  email: z.string().optional(),
  instituicao: z.string().optional(),
  ordem: z.number().default(0),
});

const periodicoAlternativoSchema = z.object({
  periodicoNome: z.string().min(1),
  periodicoISSN: z.string().optional(),
  periodicoArea: z.string().optional(),
  prioridade: z.number(),
  motivo: z.string().optional(),
});

const createSubmissaoSchema = z.object({
  titulo: z.string().min(1),
  resumo: z.string().min(1),
  palavrasChave: z.string().min(1),
  periodicoId: z.string().min(1),
  planoAcao: z.string().optional(),
  autores: z.array(autorSchema),
  periodicosAlternativos: z.array(periodicoAlternativoSchema).optional(),
  submissaoOriginalId: z.string().optional(),
});

const updateSubmissaoSchema = z.object({
  id: z.string(),
  titulo: z.string().optional(),
  resumo: z.string().optional(),
  palavrasChave: z.string().optional(),
  status: z
    .enum(["EM_AVALIACAO", "APROVADO", "REJEITADO", "REVISAO_SOLICITADA", "SUBMETIDO_NOVAMENTE"])
    .optional(),
  planoAcao: z.string().optional(),
  periodicoId: z.string().optional(),
  autores: z.array(autorSchema).optional(),
  periodicosAlternativos: z.array(periodicoAlternativoSchema).optional(),
});

const createRevisaoSchema = z.object({
  submissaoId: z.string().min(1),
  dataRecebimento: z.date(),
  numeroRevisores: z.number().min(1),
  comentarios: z.string().min(1),
  revisorId: z.string().optional(),
});

// ============= ROUTERS =============

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
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
      .input(z.number().default(10))
      .query(async ({ input }) => {
        return await db.getPeriodicosMaisUtilizados(input);
      }),
  }),

  // ============= USUÁRIOS =============
  usuarios: router({
    list: publicProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    getById: publicProcedure.input(z.string()).query(async ({ input }) => {
      return await db.getUser(input);
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
      if (!input || input.trim() === "") {
        return await db.getAllPeriodicos();
      }
      return await db.searchPeriodicos(input);
    }),

    create: protectedProcedure.input(createPeriodicoSchema).mutation(async ({ input }) => {
      await db.createPeriodico(input);
      return { success: true };
    }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          data: createPeriodicoSchema.partial(),
        })
      )
      .mutation(async ({ input }) => {
        await db.updatePeriodico(input.id, input.data);
        return { success: true };
      }),

    delete: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
      await db.deletePeriodico(input);
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
      const submissao = await db.getSubmissaoById(input);
      if (!submissao) return null;

      const autores = await db.getAutoresBySubmissao(input);
      const revisoes = await db.getRevisoesBySubmissao(input);
      const periodicosAlt = await db.getPeriodicosAlternativosBySubmissao(input);
      const historico = await db.getHistoricoBySubmissao(input);

      return {
        ...submissao,
        autores,
        revisoes,
        periodicosAlternativos: periodicosAlt,
        historico,
      };
    }),

    byStatus: publicProcedure.input(z.string()).query(async ({ input }) => {
      return await db.getSubmissoesByStatus(input);
    }),

    byPeriodico: publicProcedure.input(z.string()).query(async ({ input }) => {
      return await db.getSubmissoesByPeriodico(input);
    }),

    byCriador: publicProcedure.input(z.string()).query(async ({ input }) => {
      return await db.getSubmissoesByCriador(input);
    }),

    create: protectedProcedure.input(createSubmissaoSchema).mutation(async ({ input, ctx }) => {
      const submissaoData = {
        titulo: input.titulo,
        resumo: input.resumo,
        palavrasChave: input.palavrasChave,
        periodicoId: input.periodicoId,
        planoAcao: input.planoAcao,
        criadorId: ctx.user.id,
        submissaoOriginalId: input.submissaoOriginalId,
      };

      const submissaoId = crypto.randomUUID();
      await db.createSubmissao({ ...submissaoData, id: submissaoId });

      // Criar autores
      for (const autor of input.autores) {
        await db.createAutor({
          ...autor,
          submissaoId: submissaoId.toString(),
        });
      }

      // Criar periódicos alternativos
      if (input.periodicosAlternativos) {
        for (const alt of input.periodicosAlternativos) {
          await db.createPeriodicoAlternativo({
            ...alt,
            submissaoId: submissaoId.toString(),
          });
        }
      }

      // Criar histórico inicial
      await db.createHistoricoStatus({
        submissaoId: submissaoId.toString(),
        status: "EM_AVALIACAO",
        observacao: "Submissão criada",
      });

      return { success: true, id: submissaoId.toString() };
    }),

    update: protectedProcedure.input(updateSubmissaoSchema).mutation(async ({ input }) => {
      const { id, autores, periodicosAlternativos, status, ...updateData } = input;

      // Atualizar dados básicos
      if (Object.keys(updateData).length > 0) {
        await db.updateSubmissao(id, updateData);
      }

      // Atualizar autores se fornecidos
      if (autores) {
        await db.deleteAutoresBySubmissao(id);
        for (const autor of autores) {
          await db.createAutor({
            ...autor,
            submissaoId: id,
          });
        }
      }

      // Atualizar periódicos alternativos se fornecidos
      if (periodicosAlternativos) {
        await db.deletePeriodicosAlternativosBySubmissao(id);
        for (const alt of periodicosAlternativos) {
          await db.createPeriodicoAlternativo({
            ...alt,
            submissaoId: id,
          });
        }
      }

      // Se o status mudou, criar histórico
      if (status) {
        await db.updateSubmissao(id, { status });
        await db.createHistoricoStatus({
          submissaoId: id,
          status,
          observacao: `Status alterado para ${status}`,
        });
      }

      return { success: true };
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
        await db.updateSubmissao(input.id, { status: input.status });
        await db.createHistoricoStatus({
          submissaoId: input.id,
          status: input.status,
          observacao: input.observacao || `Status alterado para ${input.status}`,
        });
        return { success: true };
      }),

    delete: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
      // Deletar dados relacionados
      await db.deleteAutoresBySubmissao(input);
      await db.deletePeriodicosAlternativosBySubmissao(input);

      // Deletar submissão
      await db.deleteSubmissao(input);
      return { success: true };
    }),
  }),

  // ============= REVISÕES =============
  revisoes: router({
    list: publicProcedure.query(async () => {
      return await db.getAllRevisoes();
    }),

    bySubmissao: publicProcedure.input(z.string()).query(async ({ input }) => {
      return await db.getRevisoesBySubmissao(input);
    }),

    create: protectedProcedure.input(createRevisaoSchema).mutation(async ({ input }) => {
      await db.createRevisao(input);
      return { success: true };
    }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          data: createRevisaoSchema.partial().omit({ submissaoId: true }),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateRevisao(input.id, input.data);
        return { success: true };
      }),

    delete: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
      await db.deleteRevisao(input);
      return { success: true };
    }),
  }),

  // ============= REENCAMINHAMENTO INTELIGENTE =============
  reencaminhamento: router({
    sugestoes: publicProcedure.input(z.string()).query(async ({ input }) => {
      const submissao = await db.getSubmissaoById(input);
      if (!submissao) return [];

      const todosPeriodicos = await db.getAllPeriodicos();
      const palavrasChaveSubmissao = submissao.submissao.palavrasChave
        .toLowerCase()
        .split(",")
        .map((p) => p.trim());

      // Calcular pontuação para cada periódico
      const sugestoes = todosPeriodicos
        .filter((p) => p.id !== submissao.submissao.periodicoId)
        .map((periodico) => {
          let pontuacao = 0;

          // 1. Alinhamento de área (40%)
          if (periodico.area && submissao.periodico?.area) {
            if (periodico.area.toLowerCase() === submissao.periodico.area.toLowerCase()) {
              pontuacao += 40;
            } else if (
              periodico.area.toLowerCase().includes(submissao.periodico.area.toLowerCase()) ||
              submissao.periodico.area.toLowerCase().includes(periodico.area.toLowerCase())
            ) {
              pontuacao += 24; // 60% de 40
            } else {
              pontuacao += 8; // 20% de 40
            }
          }

          // 2. Classificação Qualis (30%)
          const qualisScores: Record<string, number> = {
            A1: 30,
            A2: 27,
            B1: 22.5,
            B2: 18,
            B3: 13.5,
            B4: 9,
            B5: 6,
          };
          if (periodico.qualis) {
            pontuacao += qualisScores[periodico.qualis] || 9;
          } else {
            pontuacao += 9;
          }

          // 3. Palavras-chave (10%)
          if (periodico.descricao) {
            const descricaoLower = periodico.descricao.toLowerCase();
            const matches = palavrasChaveSubmissao.filter((palavra) =>
              descricaoLower.includes(palavra)
            ).length;
            pontuacao += (matches / palavrasChaveSubmissao.length) * 10;
          }

          // 4. Popularidade (20%) - será calculado com base em submissões
          // Por enquanto, adicionar pontuação base
          pontuacao += 10;

          // Determinar alinhamento
          let alinhamento: "alto" | "medio" | "baixo";
          if (pontuacao >= 80) alinhamento = "alto";
          else if (pontuacao >= 60) alinhamento = "medio";
          else alinhamento = "baixo";

          // Gerar motivo
          const motivos = [];
          if (periodico.area === submissao.periodico?.area) {
            motivos.push("Mesma área de conhecimento");
          }
          if (periodico.qualis && ["A1", "A2", "B1"].includes(periodico.qualis)) {
            motivos.push(`Classificação Qualis ${periodico.qualis}`);
          }

          return {
            periodico,
            pontuacao: Math.round(pontuacao),
            alinhamento,
            motivo: motivos.join(", ") || "Periódico relevante na área",
          };
        })
        .sort((a, b) => b.pontuacao - a.pontuacao)
        .slice(0, 10);

      return sugestoes;
    }),
  }),
});

export type AppRouter = typeof appRouter;

