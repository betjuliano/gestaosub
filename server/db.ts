import { eq, desc, like, or, sql, and, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  periodicos,
  InsertPeriodico,
  submissoes,
  InsertSubmissao,
  autores,
  InsertAutor,
  revisoes,
  InsertRevisao,
  periodicosAlternativos,
  InsertPeriodicoAlternativo,
  historicoStatus,
  InsertHistoricoStatus,
  configuracoes,
  InsertConfiguracao,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= USERS =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { id: user.id };
    const updateSet: Record<string, unknown> = {};

    const textFields = [
      "name",
      "email",
      "loginMethod",
      "universidade",
      "areaFormacao",
      "universidadeOrigem",
      "telefone",
    ] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.nivelFormacao !== undefined) {
      values.nivelFormacao = user.nivelFormacao;
      updateSet.nivelFormacao = user.nivelFormacao;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }

    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = "admin";
        values.role = "admin";
        updateSet.role = "admin";
      }
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function loginUser(email: string, senha: string) {
  const db = await getDb();
  if (!db) return null;

  // Admin especial
  if (email === "admjulianoo@gmail.com" && senha === "Adm4125") {
    // Buscar ou criar admin
    let admin = await getUserByEmail(email);
    if (!admin) {
      const adminId = crypto.randomUUID();
      await db.insert(users).values({
        id: adminId,
        name: "Administrador",
        email: email,
        senha: senha,
        role: "admin",
        loginMethod: "password",
      });
      admin = await getUserByEmail(email);
    }
    return admin || null;
  }

  // Usuário normal
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (result.length === 0) return null;

  const user = result[0];
  if (user.senha !== senha) return null;

  return user;
}

export async function createUser(data: {
  nome: string;
  email: string;
  senha: string;
  universidade: string;
  areaFormacao: string;
  nivelFormacao: string;
  telefone: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const userId = crypto.randomUUID();
  
  await db.insert(users).values({
    id: userId,
    name: data.nome,
    email: data.email,
    senha: data.senha,
    universidade: data.universidade,
    areaFormacao: data.areaFormacao,
    nivelFormacao: data.nivelFormacao as any,
    telefone: data.telefone,
    role: "user",
    loginMethod: "password",
  });

  return userId;
}

export async function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    universidade?: string;
    areaFormacao?: string;
    nivelFormacao?: "graduacao" | "mestrado" | "doutorado" | "pos_doutorado";
    universidadeOrigem?: string;
    telefone?: string;
  }
) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set(data).where(eq(users.id, userId));
}

// ============= PERIÓDICOS =============

export async function createPeriodico(data: InsertPeriodico) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(periodicos).values(data);
  return result;
}

export async function getAllPeriodicos() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(periodicos).orderBy(periodicos.nome);
}

export async function getPeriodicoById(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(periodicos).where(eq(periodicos.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function searchPeriodicos(query: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(periodicos)
    .where(
      or(
        like(periodicos.nome, `%${query}%`),
        like(periodicos.issn, `%${query}%`),
        like(periodicos.area, `%${query}%`)
      )
    )
    .orderBy(periodicos.nome);
}

export async function getPeriodicosMaisUtilizados(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      periodico: periodicos,
      totalSubmissoes: count(submissoes.id).as("totalSubmissoes"),
    })
    .from(periodicos)
    .leftJoin(submissoes, eq(periodicos.id, submissoes.periodicoId))
    .groupBy(periodicos.id)
    .orderBy(desc(sql`totalSubmissoes`))
    .limit(limit);

  return result;
}

export async function getPeriodicoStats(periodicoId: string) {
  const db = await getDb();
  if (!db)
    return {
      total: 0,
      emAvaliacao: 0,
      aprovadas: 0,
      rejeitadas: 0,
      revisaoSolicitada: 0,
    };

  const stats = await db
    .select({
      status: submissoes.status,
      count: count(submissoes.id).as("count"),
    })
    .from(submissoes)
    .where(eq(submissoes.periodicoId, periodicoId))
    .groupBy(submissoes.status);

  const result = {
    total: 0,
    emAvaliacao: 0,
    aprovadas: 0,
    rejeitadas: 0,
    revisaoSolicitada: 0,
  };

  stats.forEach((stat) => {
    const statusCount = Number(stat.count);
    result.total += statusCount;

    switch (stat.status) {
      case "EM_AVALIACAO":
        result.emAvaliacao = statusCount;
        break;
      case "APROVADO":
        result.aprovadas = statusCount;
        break;
      case "REJEITADO":
        result.rejeitadas = statusCount;
        break;
      case "REVISAO_SOLICITADA":
        result.revisaoSolicitada = statusCount;
        break;
    }
  });

  return result;
}

// ============= SUBMISSÕES =============

export async function createSubmissao(data: InsertSubmissao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(submissoes).values(data);
  return result;
}

export async function getAllSubmissoes() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      submissao: submissoes,
      criador: users,
      periodico: periodicos,
    })
    .from(submissoes)
    .leftJoin(users, eq(submissoes.criadorId, users.id))
    .leftJoin(periodicos, eq(submissoes.periodicoId, periodicos.id))
    .orderBy(desc(submissoes.dataSubmissao));

  return result;
}

export async function getSubmissaoById(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const submissaoResult = await db
    .select({
      submissao: submissoes,
      criador: users,
      periodico: periodicos,
    })
    .from(submissoes)
    .leftJoin(users, eq(submissoes.criadorId, users.id))
    .leftJoin(periodicos, eq(submissoes.periodicoId, periodicos.id))
    .where(eq(submissoes.id, id))
    .limit(1);

  if (submissaoResult.length === 0) return undefined;

  const autoresResult = await db
    .select()
    .from(autores)
    .where(eq(autores.submissaoId, id))
    .orderBy(autores.ordem);

  const revisoesResult = await db
    .select({
      revisao: revisoes,
      revisor: users,
    })
    .from(revisoes)
    .leftJoin(users, eq(revisoes.revisorId, users.id))
    .where(eq(revisoes.submissaoId, id))
    .orderBy(desc(revisoes.dataRecebimento));

  const historicoResult = await db
    .select()
    .from(historicoStatus)
    .where(eq(historicoStatus.submissaoId, id))
    .orderBy(desc(historicoStatus.data));

  return {
    ...submissaoResult[0],
    autores: autoresResult,
    revisoes: revisoesResult,
    historico: historicoResult,
  };
}

export async function getSubmissoesByPeriodico(periodicoId: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      submissao: submissoes,
      criador: users,
    })
    .from(submissoes)
    .leftJoin(users, eq(submissoes.criadorId, users.id))
    .where(eq(submissoes.periodicoId, periodicoId))
    .orderBy(desc(submissoes.dataSubmissao));

  return result;
}

export async function updateSubmissaoStatus(
  submissaoId: string,
  status: "EM_AVALIACAO" | "APROVADO" | "REJEITADO" | "REVISAO_SOLICITADA" | "SUBMETIDO_NOVAMENTE",
  observacao?: string
) {
  const db = await getDb();
  if (!db) return;

  await db.update(submissoes).set({ status }).where(eq(submissoes.id, submissaoId));

  await db.insert(historicoStatus).values({
    submissaoId,
    status,
    observacao,
  });
}

// ============= AUTORES =============

export async function createAutor(data: InsertAutor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(autores).values(data);
}

export async function createAutores(data: InsertAutor[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.length === 0) return;
  return await db.insert(autores).values(data);
}

// ============= REVISÕES =============

export async function createRevisao(data: InsertRevisao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(revisoes).values(data);
}

export async function getAllRevisoes() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      revisao: revisoes,
      submissao: submissoes,
      revisor: users,
    })
    .from(revisoes)
    .leftJoin(submissoes, eq(revisoes.submissaoId, submissoes.id))
    .leftJoin(users, eq(revisoes.revisorId, users.id))
    .orderBy(desc(revisoes.dataRecebimento));

  return result;
}

export async function updateRevisaoAnalise(
  revisaoId: string,
  analisePercentual: number,
  sugestoesLLM: string
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(revisoes)
    .set({ analisePercentual, sugestoesLLM })
    .where(eq(revisoes.id, revisaoId));
}

// ============= CONFIGURAÇÕES =============

export async function getConfiguracao(userId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(configuracoes).where(eq(configuracoes.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertConfiguracao(data: InsertConfiguracao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getConfiguracao(data.userId);

  if (existing) {
    await db.update(configuracoes).set(data).where(eq(configuracoes.userId, data.userId));
  } else {
    await db.insert(configuracoes).values(data);
  }
}

// ============= DASHBOARD =============

export async function getDashboardStats() {
  const db = await getDb();
  if (!db)
    return {
      totalSubmissoes: 0,
      emAvaliacao: 0,
      aprovadas: 0,
      rejeitadas: 0,
      revisaoSolicitada: 0,
    };

  const stats = await db
    .select({
      status: submissoes.status,
      count: count(submissoes.id).as("count"),
    })
    .from(submissoes)
    .groupBy(submissoes.status);

  const result = {
    totalSubmissoes: 0,
    emAvaliacao: 0,
    aprovadas: 0,
    rejeitadas: 0,
    revisaoSolicitada: 0,
  };

  stats.forEach((stat) => {
    const statusCount = Number(stat.count);
    result.totalSubmissoes += statusCount;

    switch (stat.status) {
      case "EM_AVALIACAO":
        result.emAvaliacao = statusCount;
        break;
      case "APROVADO":
        result.aprovadas = statusCount;
        break;
      case "REJEITADO":
        result.rejeitadas = statusCount;
        break;
      case "REVISAO_SOLICITADA":
        result.revisaoSolicitada = statusCount;
        break;
    }
  });

  return result;
}

export async function getRecentSubmissoes(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      submissao: submissoes,
      criador: users,
      periodico: periodicos,
    })
    .from(submissoes)
    .leftJoin(users, eq(submissoes.criadorId, users.id))
    .leftJoin(periodicos, eq(submissoes.periodicoId, periodicos.id))
    .orderBy(desc(submissoes.dataSubmissao))
    .limit(limit);
}

