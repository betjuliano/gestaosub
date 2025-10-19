import { eq, desc, and, like, or, sql, asc } from "drizzle-orm";
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
  Periodico,
  Submissao,
  Autor,
  Revisao,
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
    const values: InsertUser = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

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
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.createdAt));
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
  return await db.select().from(periodicos).orderBy(asc(periodicos.nome));
}

export async function getPeriodicoById(id: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(periodicos).where(eq(periodicos.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
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
    .orderBy(asc(periodicos.nome));
}

export async function updatePeriodico(id: string, data: Partial<InsertPeriodico>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(periodicos).set(data).where(eq(periodicos.id, id));
}

export async function deletePeriodico(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(periodicos).where(eq(periodicos.id, id));
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

  return await db
    .select({
      submissao: submissoes,
      periodico: periodicos,
      criador: users,
    })
    .from(submissoes)
    .leftJoin(periodicos, eq(submissoes.periodicoId, periodicos.id))
    .leftJoin(users, eq(submissoes.criadorId, users.id))
    .orderBy(desc(submissoes.dataSubmissao));
}

export async function getSubmissaoById(id: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      submissao: submissoes,
      periodico: periodicos,
      criador: users,
    })
    .from(submissoes)
    .leftJoin(periodicos, eq(submissoes.periodicoId, periodicos.id))
    .leftJoin(users, eq(submissoes.criadorId, users.id))
    .where(eq(submissoes.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getSubmissoesByStatus(status: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      submissao: submissoes,
      periodico: periodicos,
      criador: users,
    })
    .from(submissoes)
    .leftJoin(periodicos, eq(submissoes.periodicoId, periodicos.id))
    .leftJoin(users, eq(submissoes.criadorId, users.id))
    .where(eq(submissoes.status, status as any))
    .orderBy(desc(submissoes.dataSubmissao));
}

export async function getSubmissoesByPeriodico(periodicoId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      submissao: submissoes,
      periodico: periodicos,
      criador: users,
    })
    .from(submissoes)
    .leftJoin(periodicos, eq(submissoes.periodicoId, periodicos.id))
    .leftJoin(users, eq(submissoes.criadorId, users.id))
    .where(eq(submissoes.periodicoId, periodicoId))
    .orderBy(desc(submissoes.dataSubmissao));
}

export async function getSubmissoesByCriador(criadorId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      submissao: submissoes,
      periodico: periodicos,
      criador: users,
    })
    .from(submissoes)
    .leftJoin(periodicos, eq(submissoes.periodicoId, periodicos.id))
    .leftJoin(users, eq(submissoes.criadorId, users.id))
    .where(eq(submissoes.criadorId, criadorId))
    .orderBy(desc(submissoes.dataSubmissao));
}

export async function updateSubmissao(id: string, data: Partial<InsertSubmissao>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(submissoes).set(data).where(eq(submissoes.id, id));
}

export async function deleteSubmissao(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(submissoes).where(eq(submissoes.id, id));
}

// ============= AUTORES =============

export async function createAutor(data: InsertAutor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(autores).values(data);
}

export async function getAutoresBySubmissao(submissaoId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(autores)
    .where(eq(autores.submissaoId, submissaoId))
    .orderBy(asc(autores.ordem));
}

export async function deleteAutoresBySubmissao(submissaoId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(autores).where(eq(autores.submissaoId, submissaoId));
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

  return await db
    .select({
      revisao: revisoes,
      submissao: submissoes,
      revisor: users,
    })
    .from(revisoes)
    .leftJoin(submissoes, eq(revisoes.submissaoId, submissoes.id))
    .leftJoin(users, eq(revisoes.revisorId, users.id))
    .orderBy(desc(revisoes.dataRecebimento));
}

export async function getRevisoesBySubmissao(submissaoId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      revisao: revisoes,
      revisor: users,
    })
    .from(revisoes)
    .leftJoin(users, eq(revisoes.revisorId, users.id))
    .where(eq(revisoes.submissaoId, submissaoId))
    .orderBy(desc(revisoes.dataRecebimento));
}

export async function updateRevisao(id: string, data: Partial<InsertRevisao>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.update(revisoes).set(data).where(eq(revisoes.id, id));
}

export async function deleteRevisao(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(revisoes).where(eq(revisoes.id, id));
}

// ============= PERIÓDICOS ALTERNATIVOS =============

export async function createPeriodicoAlternativo(data: InsertPeriodicoAlternativo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(periodicosAlternativos).values(data);
}

export async function getPeriodicosAlternativosBySubmissao(submissaoId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(periodicosAlternativos)
    .where(eq(periodicosAlternativos.submissaoId, submissaoId))
    .orderBy(asc(periodicosAlternativos.prioridade));
}

export async function deletePeriodicosAlternativosBySubmissao(submissaoId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .delete(periodicosAlternativos)
    .where(eq(periodicosAlternativos.submissaoId, submissaoId));
}

// ============= HISTÓRICO DE STATUS =============

export async function createHistoricoStatus(data: InsertHistoricoStatus) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(historicoStatus).values(data);
}

export async function getHistoricoBySubmissao(submissaoId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(historicoStatus)
    .where(eq(historicoStatus.submissaoId, submissaoId))
    .orderBy(desc(historicoStatus.data));
}

// ============= ESTATÍSTICAS =============

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
      count: sql<number>`count(*)`.as("count"),
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
    const count = Number(stat.count);
    result.totalSubmissoes += count;

    switch (stat.status) {
      case "EM_AVALIACAO":
        result.emAvaliacao = count;
        break;
      case "APROVADO":
        result.aprovadas = count;
        break;
      case "REJEITADO":
        result.rejeitadas = count;
        break;
      case "REVISAO_SOLICITADA":
        result.revisaoSolicitada = count;
        break;
    }
  });

  return result;
}

export async function getPeriodicosMaisUtilizados(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      periodico: periodicos,
      totalSubmissoes: sql<number>`count(${submissoes.id})`.as("total"),
    })
    .from(periodicos)
    .leftJoin(submissoes, eq(periodicos.id, submissoes.periodicoId))
    .groupBy(periodicos.id)
    .orderBy(desc(sql`count(${submissoes.id})`))
    .limit(limit);
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
      count: sql<number>`count(*)`.as("count"),
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
    const count = Number(stat.count);
    result.total += count;

    switch (stat.status) {
      case "EM_AVALIACAO":
        result.emAvaliacao = count;
        break;
      case "APROVADO":
        result.aprovadas = count;
        break;
      case "REJEITADO":
        result.rejeitadas = count;
        break;
      case "REVISAO_SOLICITADA":
        result.revisaoSolicitada = count;
        break;
    }
  });

  return result;
}

