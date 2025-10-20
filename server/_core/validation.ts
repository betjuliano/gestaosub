import { z } from 'zod';

/**
 * Esquemas de validação para inputs do sistema
 */

// Validação de email
export const emailSchema = z
  .string()
  .email('Email inválido')
  .max(320, 'Email muito longo')
  .toLowerCase()
  .trim();

// Validação de senha
export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .max(128, 'Senha muito longa')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número');

// Validação de nome
export const nameSchema = z
  .string()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(300, 'Nome muito longo')
  .trim()
  .regex(/^[a-zA-ZÀ-ÿ\s\-'\.]+$/, 'Nome contém caracteres inválidos');

// Validação de telefone
export const phoneSchema = z
  .string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Telefone inválido')
  .optional();

// Validação de universidade/instituição
export const institutionSchema = z
  .string()
  .min(2, 'Nome da instituição deve ter pelo menos 2 caracteres')
  .max(500, 'Nome da instituição muito longo')
  .trim();

// Validação de área de formação
export const areaFormacaoSchema = z
  .string()
  .min(2, 'Área de formação deve ter pelo menos 2 caracteres')
  .max(200, 'Área de formação muito longa')
  .trim();

// Validação de nível de formação
export const nivelFormacaoSchema = z.enum(['graduacao', 'mestrado', 'doutorado', 'pos_doutorado']);

// Validação de ISSN
export const issnSchema = z
  .string()
  .regex(/^\d{4}-\d{3}[\dX]$/, 'ISSN deve estar no formato 0000-000X')
  .trim();

// Validação de título de artigo
export const tituloArtigoSchema = z
  .string()
  .min(10, 'Título deve ter pelo menos 10 caracteres')
  .max(1000, 'Título muito longo')
  .trim();

// Validação de resumo
export const resumoSchema = z
  .string()
  .min(100, 'Resumo deve ter pelo menos 100 caracteres')
  .max(5000, 'Resumo muito longo')
  .trim();

// Validação de palavras-chave
export const palavrasChaveSchema = z
  .string()
  .min(10, 'Palavras-chave devem ter pelo menos 10 caracteres')
  .max(500, 'Palavras-chave muito longas')
  .trim();

// Validação de ID (UUID)
export const uuidSchema = z
  .string()
  .uuid('ID inválido');

// Validação de status de submissão
export const statusSubmissaoSchema = z.enum([
  'EM_AVALIACAO',
  'APROVADO', 
  'REJEITADO',
  'REVISAO_SOLICITADA',
  'SUBMETIDO_NOVAMENTE'
]);

// Esquemas compostos para operações específicas

export const createUserSchema = z.object({
  nome: nameSchema,
  email: emailSchema,
  senha: passwordSchema,
  universidade: institutionSchema,
  areaFormacao: areaFormacaoSchema,
  nivelFormacao: nivelFormacaoSchema,
  telefone: phoneSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, 'Senha é obrigatória'),
});

export const updateUserProfileSchema = z.object({
  name: nameSchema.optional(),
  universidade: institutionSchema.optional(),
  areaFormacao: areaFormacaoSchema.optional(),
  nivelFormacao: nivelFormacaoSchema.optional(),
  universidadeOrigem: institutionSchema.optional(),
  telefone: phoneSchema,
});

export const createPeriodicoSchema = z.object({
  nome: z.string().min(2).max(500).trim(),
  issn: issnSchema,
  area: z.string().max(200).trim().optional(),
  abdc: z.string().max(10).optional(),
  abs: z.string().max(10).optional(),
  sjr: z.string().max(20).optional(),
  jcr: z.string().max(20).optional(),
  citeScore: z.string().max(20).optional(),
  fatorImpacto: z.string().max(20).optional(),
  qualis: z.enum(['muito_bom', 'bom', 'fraco', 'sem_classificacao']).optional(),
  spell: z.string().max(10).optional(),
  scielo: z.string().max(10).optional(),
  hIndex: z.string().max(20).optional(),
  numeroPalavras: z.number().int().positive().optional(),
  padraoFormatacao: z.enum(['APA', 'NBR6023', 'Chicago', 'Harvard', 'Outra']).optional(),
  padraoFormatacaoOutra: z.string().max(200).optional(),
  descricao: z.string().max(5000).optional(),
  publisher: z.string().max(300).optional(),
});

export const createSubmissaoSchema = z.object({
  titulo: tituloArtigoSchema,
  resumo: resumoSchema,
  palavrasChave: palavrasChaveSchema,
  periodicoId: uuidSchema,
  periodicoSecundarioId: uuidSchema.optional(),
  submissaoOriginalId: uuidSchema.optional(),
  dataPrazo: z.date().optional(),
  planoAcao: z.string().max(5000).optional(),
});

export const createAutorSchema = z.object({
  nome: nameSchema,
  email: emailSchema.optional(),
  instituicao: institutionSchema.optional(),
  submissaoId: uuidSchema,
  ordem: z.number().int().min(0),
});

export const createRevisaoSchema = z.object({
  dataRecebimento: z.date(),
  dataPrazo: z.date().optional(),
  numeroRevisores: z.number().int().min(1).max(4),
  solicitacaoRevisor1: z.string().max(5000).optional(),
  respostaRevisor1: z.string().max(5000).optional(),
  solicitacaoRevisor2: z.string().max(5000).optional(),
  respostaRevisor2: z.string().max(5000).optional(),
  solicitacaoRevisor3: z.string().max(5000).optional(),
  respostaRevisor3: z.string().max(5000).optional(),
  solicitacaoRevisor4: z.string().max(5000).optional(),
  respostaRevisor4: z.string().max(5000).optional(),
  comentarios: z.string().max(5000).optional(),
  submissaoId: uuidSchema,
  revisorId: uuidSchema.optional(),
});

/**
 * Função utilitária para sanitizar strings
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove caracteres perigosos
    .replace(/\s+/g, ' '); // Normaliza espaços
}

/**
 * Função utilitária para validar e sanitizar email
 */
export function validateAndSanitizeEmail(email: string): string {
  const result = emailSchema.safeParse(email);
  if (!result.success) {
    const firstError = result.error.errors?.[0]?.message || 'Email inválido';
    throw new Error(`Email inválido: ${firstError}`);
  }
  return result.data;
}

/**
 * Função utilitária para validar senha
 */
export function validatePassword(password: string): void {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    const firstError = result.error.errors?.[0]?.message || 'Senha inválida';
    throw new Error(`Senha inválida: ${firstError}`);
  }
}

/**
 * Middleware para validação de esquemas Zod
 */
export function validateSchema<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    const result = schema.safeParse(data);
    if (!result.success) {
      const errors = result.error.errors?.map(err => `${err.path.join('.')}: ${err.message}`) || ['Dados inválidos'];
      throw new Error(`Dados inválidos: ${errors.join(', ')}`);
    }
    return result.data;
  };
}

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type CreatePeriodicoInput = z.infer<typeof createPeriodicoSchema>;
export type CreateSubmissaoInput = z.infer<typeof createSubmissaoSchema>;
export type CreateAutorInput = z.infer<typeof createAutorSchema>;
export type CreateRevisaoInput = z.infer<typeof createRevisaoSchema>;
