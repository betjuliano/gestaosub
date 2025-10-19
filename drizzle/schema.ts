import { mysqlEnum, mysqlTable, text, timestamp, varchar, int, index, boolean } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Novos campos de perfil
  universidade: varchar("universidade", { length: 300 }),
  areaFormacao: varchar("areaFormacao", { length: 200 }),
  nivelFormacao: mysqlEnum("nivelFormacao", ["graduacao", "mestrado", "doutorado", "pos_doutorado"]),
  universidadeOrigem: varchar("universidadeOrigem", { length: 300 }),
  telefone: varchar("telefone", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Periódicos acadêmicos
 */
export const periodicos = mysqlTable("periodicos", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  nome: varchar("nome", { length: 500 }).notNull(),
  issn: varchar("issn", { length: 20 }).notNull(),
  area: varchar("area", { length: 200 }),
  // Classificações
  abdc: varchar("abdc", { length: 10 }),
  abs: varchar("abs", { length: 10 }),
  sjr: varchar("sjr", { length: 20 }),
  jcr: varchar("jcr", { length: 20 }),
  citeScore: varchar("citeScore", { length: 20 }),
  fatorImpacto: varchar("fatorImpacto", { length: 20 }),
  qualis: mysqlEnum("qualis", ["muito_bom", "bom", "fraco", "sem_classificacao"]),
  spell: varchar("spell", { length: 10 }),
  scielo: varchar("scielo", { length: 10 }),
  hIndex: varchar("hIndex", { length: 20 }),
  // Formatação
  numeroPalavras: int("numeroPalavras"),
  padraoFormatacao: mysqlEnum("padraoFormatacao", ["APA", "NBR6023", "Chicago", "Harvard", "Outra"]),
  padraoFormatacaoOutra: varchar("padraoFormatacaoOutra", { length: 200 }),
  descricao: text("descricao"),
  publisher: varchar("publisher", { length: 300 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  nomeIdx: index("nome_idx").on(table.nome),
  issnIdx: index("issn_idx").on(table.issn),
  areaIdx: index("area_idx").on(table.area),
}));

export type Periodico = typeof periodicos.$inferSelect;
export type InsertPeriodico = typeof periodicos.$inferInsert;

/**
 * Submissões de artigos
 */
export const submissoes = mysqlTable("submissoes", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  titulo: varchar("titulo", { length: 1000 }).notNull(),
  resumo: text("resumo").notNull(),
  palavrasChave: text("palavrasChave").notNull(),
  dataSubmissao: timestamp("dataSubmissao").defaultNow().notNull(),
  status: mysqlEnum("status", [
    "EM_AVALIACAO",
    "APROVADO",
    "REJEITADO",
    "REVISAO_SOLICITADA",
    "SUBMETIDO_NOVAMENTE"
  ]).default("EM_AVALIACAO").notNull(),
  planoAcao: text("planoAcao"),
  criadorId: varchar("criadorId", { length: 64 }).notNull(),
  periodicoId: varchar("periodicoId", { length: 64 }).notNull(),
  periodicoSecundarioId: varchar("periodicoSecundarioId", { length: 64 }),
  submissaoOriginalId: varchar("submissaoOriginalId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  criadorIdx: index("criador_idx").on(table.criadorId),
  periodicoIdx: index("periodico_idx").on(table.periodicoId),
  statusIdx: index("status_idx").on(table.status),
  dataIdx: index("data_idx").on(table.dataSubmissao),
}));

export type Submissao = typeof submissoes.$inferSelect;
export type InsertSubmissao = typeof submissoes.$inferInsert;

/**
 * Autores de artigos
 */
export const autores = mysqlTable("autores", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  nome: varchar("nome", { length: 300 }).notNull(),
  email: varchar("email", { length: 320 }),
  instituicao: varchar("instituicao", { length: 500 }),
  submissaoId: varchar("submissaoId", { length: 64 }).notNull(),
  ordem: int("ordem").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  submissaoIdx: index("submissao_idx").on(table.submissaoId),
}));

export type Autor = typeof autores.$inferSelect;
export type InsertAutor = typeof autores.$inferInsert;

/**
 * Revisões recebidas
 */
export const revisoes = mysqlTable("revisoes", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  dataRecebimento: timestamp("dataRecebimento").notNull(),
  numeroRevisores: int("numeroRevisores").notNull(),
  // Campos separados para cada revisor
  solicitacaoRevisor1: text("solicitacaoRevisor1"),
  respostaRevisor1: text("respostaRevisor1"),
  solicitacaoRevisor2: text("solicitacaoRevisor2"),
  respostaRevisor2: text("respostaRevisor2"),
  solicitacaoRevisor3: text("solicitacaoRevisor3"),
  respostaRevisor3: text("respostaRevisor3"),
  solicitacaoRevisor4: text("solicitacaoRevisor4"),
  respostaRevisor4: text("respostaRevisor4"),
  comentarios: text("comentarios"),
  // Análise da LLM
  analisePercentual: int("analisePercentual"),
  sugestoesLLM: text("sugestoesLLM"),
  submissaoId: varchar("submissaoId", { length: 64 }).notNull(),
  revisorId: varchar("revisorId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  submissaoIdx: index("submissao_idx").on(table.submissaoId),
  revisorIdx: index("revisor_idx").on(table.revisorId),
}));

export type Revisao = typeof revisoes.$inferSelect;
export type InsertRevisao = typeof revisoes.$inferInsert;

/**
 * Periódicos alternativos para uma submissão
 */
export const periodicosAlternativos = mysqlTable("periodicos_alternativos", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  submissaoId: varchar("submissaoId", { length: 64 }).notNull(),
  periodicoNome: varchar("periodicoNome", { length: 500 }).notNull(),
  periodicoISSN: varchar("periodicoISSN", { length: 20 }),
  periodicoArea: varchar("periodicoArea", { length: 200 }),
  prioridade: int("prioridade").notNull(),
  motivo: text("motivo"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  submissaoIdx: index("submissao_idx").on(table.submissaoId),
  prioridadeIdx: index("prioridade_idx").on(table.prioridade),
}));

export type PeriodicoAlternativo = typeof periodicosAlternativos.$inferSelect;
export type InsertPeriodicoAlternativo = typeof periodicosAlternativos.$inferInsert;

/**
 * Histórico de mudanças de status
 */
export const historicoStatus = mysqlTable("historico_status", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  status: mysqlEnum("status", [
    "EM_AVALIACAO",
    "APROVADO",
    "REJEITADO",
    "REVISAO_SOLICITADA",
    "SUBMETIDO_NOVAMENTE"
  ]).notNull(),
  data: timestamp("data").defaultNow().notNull(),
  submissaoId: varchar("submissaoId", { length: 64 }).notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  submissaoIdx: index("submissao_idx").on(table.submissaoId),
  dataIdx: index("data_idx").on(table.data),
}));

export type HistoricoStatus = typeof historicoStatus.$inferSelect;
export type InsertHistoricoStatus = typeof historicoStatus.$inferInsert;

/**
 * Configurações do sistema
 */
export const configuracoes = mysqlTable("configuracoes", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("userId", { length: 64 }).notNull(),
  // Configurações de LLM
  llmProvider: mysqlEnum("llmProvider", [
    "openai",
    "gemini",
    "groq",
    "deepseek",
    "qwen",
    "ollama",
    "claude",
    "glm",
    "grok"
  ]),
  llmApiKey: text("llmApiKey"),
  llmModel: varchar("llmModel", { length: 100 }),
  llmEnabled: boolean("llmEnabled").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
}));

export type Configuracao = typeof configuracoes.$inferSelect;
export type InsertConfiguracao = typeof configuracoes.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  submissoesCriadas: many(submissoes),
  revisoes: many(revisoes),
  configuracoes: many(configuracoes),
}));

export const periodicosRelations = relations(periodicos, ({ many }) => ({
  submissoes: many(submissoes),
  submissoesSecundarias: many(submissoes, {
    relationName: "periodicoSecundario",
  }),
}));

export const submissoesRelations = relations(submissoes, ({ one, many }) => ({
  criador: one(users, {
    fields: [submissoes.criadorId],
    references: [users.id],
  }),
  periodico: one(periodicos, {
    fields: [submissoes.periodicoId],
    references: [periodicos.id],
  }),
  periodicoSecundario: one(periodicos, {
    fields: [submissoes.periodicoSecundarioId],
    references: [periodicos.id],
    relationName: "periodicoSecundario",
  }),
  submissaoOriginal: one(submissoes, {
    fields: [submissoes.submissaoOriginalId],
    references: [submissoes.id],
  }),
  autores: many(autores),
  revisoes: many(revisoes),
  periodicosAlternativos: many(periodicosAlternativos),
  historico: many(historicoStatus),
}));

export const autoresRelations = relations(autores, ({ one }) => ({
  submissao: one(submissoes, {
    fields: [autores.submissaoId],
    references: [submissoes.id],
  }),
}));

export const revisoesRelations = relations(revisoes, ({ one }) => ({
  submissao: one(submissoes, {
    fields: [revisoes.submissaoId],
    references: [submissoes.id],
  }),
  revisor: one(users, {
    fields: [revisoes.revisorId],
    references: [users.id],
  }),
}));

export const periodicosAlternativosRelations = relations(periodicosAlternativos, ({ one }) => ({
  submissao: one(submissoes, {
    fields: [periodicosAlternativos.submissaoId],
    references: [submissoes.id],
  }),
}));

export const historicoStatusRelations = relations(historicoStatus, ({ one }) => ({
  submissao: one(submissoes, {
    fields: [historicoStatus.submissaoId],
    references: [submissoes.id],
  }),
}));

export const configuracoesRelations = relations(configuracoes, ({ one }) => ({
  user: one(users, {
    fields: [configuracoes.userId],
    references: [users.id],
  }),
}));

