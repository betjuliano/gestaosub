import { eq, desc, like, or, sql, and, count, lt, gte } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
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
import { logger, measurePerformance } from "./_core/logger";
import { 
  validateAndSanitizeEmail, 
  validatePassword, 
  validateSchema,
  createUserSchema,
  loginSchema,
  updateUserProfileSchema,
  CreateUserInput,
  LoginInput,
  UpdateUserProfileInput
} from "./_core/validation";
import { 
  userCache, 
  periodicoCache, 
  statsCache, 
  clearUserCache, 
  clearPeriodicoCache, 
  clearStatsCache 
} from "./_core/cache";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: postgres.Sql | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Optimized PostgreSQL connection for production
      const connectionOptions = {
        max: parseInt(process.env.DB_POOL_SIZE || "20"),
        idle_timeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || "30"),
        connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || "10"),
        ssl: process.env.DB_SSL === "require" ? "require" : process.env.DB_SSL === "prefer" ? "prefer" : false,
        prepare: false, // Disable prepared statements for better compatibility
        transform: {
          undefined: null, // Transform undefined to null for PostgreSQL
        },
      };

      _client = postgres(process.env.DATABASE_URL, connectionOptions);
      _db = drizzle(_client);
      
      // Test connection
      await _client`SELECT 1`;
      logger.database("PostgreSQL connection established successfully", {
        poolSize: connectionOptions.max,
        ssl: connectionOptions.ssl,
      });
    } catch (error) {
      logger.database("Failed to connect to PostgreSQL", {
        databaseUrl: process.env.DATABASE_URL ? "***configured***" : "missing",
      }, error as Error);
      _db = null;
      _client = null;
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
    logger.warn("Cannot upsert user: database not available", { userId: user.id });
    return;
  }

  return measurePerformance("upsertUser", async () => {
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
    
    logger.database("User upserted successfully", { userId: user.id });
  }, { userId: user.id });
}

export async function getUser(id: string) {
  const cacheKey = `user:${id}`;
  
  return userCache.getOrSet(cacheKey, async () => {
    const db = await getDb();
    if (!db) return undefined;

    return measurePerformance("getUser", async () => {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    }, { userId: id });
  }, 60000); // Cache por 1 minuto
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserByEmail(email: string) {
  const cacheKey = `user:email:${email}`;
  
  return userCache.getOrSet(cacheKey, async () => {
    const db = await getDb();
    if (!db) return undefined;

    return measurePerformance("getUserByEmail", async () => {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    }, { email });
  }, 60000); // Cache por 1 minuto
}

export async function loginUser(email: string, senha: string) {
  // Validar inputs
  try {
    validateAndSanitizeEmail(email);
    if (!senha || senha.length < 1) {
      throw new Error("Senha é obrigatória");
    }
  } catch (error) {
    logger.auth("Login failed - invalid input", { email }, error as Error);
    return null;
  }

  const db = await getDb();
  if (!db) {
    logger.warn("Cannot login user: database not available", { email });
    return null;
  }

  return measurePerformance("loginUser", async () => {
    // Admin especial - usar variáveis de ambiente para segurança
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (adminEmail && adminPassword && email === adminEmail && senha === adminPassword) {
    // Buscar ou criar admin
    let admin = await getUserByEmail(email);
    if (!admin) {
      const adminId = crypto.randomUUID();
      const hashedPassword = await bcrypt.hash(adminPassword, 12); // Aumentar rounds para segurança
      await db.insert(users).values({
        id: adminId,
        name: "Administrador",
        email: email,
        senha: hashedPassword,
        role: "admin",
        loginMethod: "password",
      });
      admin = await getUserByEmail(email);
    }
      // Verificar senha com bcrypt
      if (admin && admin.senha) {
        const isValid = await bcrypt.compare(senha, admin.senha);
        if (!isValid) {
          logger.security("Admin login failed - invalid password", { email });
          return null;
        }
      }
      logger.auth("Admin login successful", { email, userId: admin?.id });
      return admin || null;
    }

    // Usuário normal
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length === 0) {
      logger.auth("Login failed - user not found", { email });
      return null;
    }

    const user = result[0];
    if (!user.senha) {
      logger.auth("Login failed - no password set", { email, userId: user.id });
      return null;
    }
    
    // Verificar senha com bcrypt
    const isValid = await bcrypt.compare(senha, user.senha);
    if (!isValid) {
      logger.security("Login failed - invalid password", { email, userId: user.id });
      return null;
    }

    logger.auth("User login successful", { email, userId: user.id });
    return user;
  }, { email });
}

export async function createUser(data: CreateUserInput) {
  // Validar dados de entrada
  const validatedData = validateSchema(createUserSchema)(data);
  
  const db = await getDb();
  if (!db) {
    logger.error("Cannot create user: database not available");
    throw new Error("Database not available");
  }

  return measurePerformance("createUser", async () => {
    // Verificar se email já existe
    const existingUser = await getUserByEmail(validatedData.email);
    if (existingUser) {
      logger.auth("User creation failed - email already exists", { email: validatedData.email });
      throw new Error("Email já está em uso");
    }

    const userId = crypto.randomUUID();
    
    // Criptografar senha com bcrypt (12 rounds para segurança)
    const hashedPassword = await bcrypt.hash(validatedData.senha, 12);
    
    await db.insert(users).values({
      id: userId,
      name: validatedData.nome,
      email: validatedData.email,
      senha: hashedPassword,
      universidade: validatedData.universidade,
      areaFormacao: validatedData.areaFormacao,
      nivelFormacao: validatedData.nivelFormacao,
      telefone: validatedData.telefone,
      role: "user",
      loginMethod: "password",
    });

    // Invalidar cache relacionado
    clearUserCache(userId);

    logger.auth("User created successfully", { 
      email: validatedData.email, 
      userId,
      universidade: validatedData.universidade 
    });
    
    return userId;
  }, { email: validatedData.email });
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
  
  // Invalidar cache do usuário
  clearUserCache(userId);
  
  logger.database("User profile updated", { userId });
}

// ============= PERIÓDICOS =============

export async function createPeriodico(data: InsertPeriodico) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(periodicos).values(data);
  
  // Invalidar cache de periódicos
  clearPeriodicoCache('all');
  
  logger.database("Periodico created", { periodicoId: data.id });
  
  return result;
}

export async function getAllPeriodicos() {
  const cacheKey = 'periodicos:all';
  
  return periodicoCache.getOrSet(cacheKey, async () => {
    const db = await getDb();
    if (!db) return [];

    return measurePerformance("getAllPeriodicos", async () => {
      return await db.select().from(periodicos).orderBy(periodicos.nome);
    });
  }, 1800000); // Cache por 30 minutos
}

export async function getPeriodicoById(id: string) {
  const cacheKey = `periodico:${id}`;
  
  return periodicoCache.getOrSet(cacheKey, async () => {
    const db = await getDb();
    if (!db) return undefined;

    return measurePerformance("getPeriodicoById", async () => {
      const result = await db.select().from(periodicos).where(eq(periodicos.id, id)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    }, { periodicoId: id });
  }, 1800000); // Cache por 30 minutos
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
  
  // Invalidar caches relacionados
  clearStatsCache();
  
  logger.database("Submissao created", { 
    submissaoId: data.id, 
    criadorId: data.criadorId,
    periodicoId: data.periodicoId 
  });
  
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
  
  // Invalidar caches relacionados
  clearStatsCache();
  
  logger.database("Submissao status updated", { 
    submissaoId, 
    newStatus: status,
    observacao 
  });
}

export async function getAlertasPrazo(usuarioId?: string) {
  const db = await getDb();
  if (!db) return { submissoes: [], revisoes: [] };

  const hoje = new Date();
  const seteDiasDepois = new Date();
  seteDiasDepois.setDate(hoje.getDate() + 7);

  // Submissões próximas do prazo (próximos 7 dias)
  let submissoesQuery = db
    .select({
      submissao: submissoes,
      periodico: periodicos,
      criador: users,
    })
    .from(submissoes)
    .leftJoin(periodicos, eq(submissoes.periodicoId, periodicos.id))
    .leftJoin(users, eq(submissoes.criadorId, users.id))
    .where(
      and(
        sql`${submissoes.dataPrazo} IS NOT NULL`,
        gte(submissoes.dataPrazo, hoje),
        lt(submissoes.dataPrazo, seteDiasDepois)
      )
    )
    .orderBy(submissoes.dataPrazo);

  // Se não for admin, filtrar por usuário
  if (usuarioId) {
    submissoesQuery = db
      .select({
        submissao: submissoes,
        periodico: periodicos,
        criador: users,
      })
      .from(submissoes)
      .leftJoin(periodicos, eq(submissoes.periodicoId, periodicos.id))
      .leftJoin(users, eq(submissoes.criadorId, users.id))
      .where(
        and(
          eq(submissoes.criadorId, usuarioId),
          sql`${submissoes.dataPrazo} IS NOT NULL`,
          gte(submissoes.dataPrazo, hoje),
          lt(submissoes.dataPrazo, seteDiasDepois)
        )
      )
      .orderBy(submissoes.dataPrazo);
  }

  const submissoesResult = await submissoesQuery;

  // Revisões próximas do prazo (próximos 7 dias)
  let revisoesQuery = db
    .select({
      revisao: revisoes,
      submissao: submissoes,
      periodico: periodicos,
    })
    .from(revisoes)
    .leftJoin(submissoes, eq(revisoes.submissaoId, submissoes.id))
    .leftJoin(periodicos, eq(submissoes.periodicoId, periodicos.id))
    .where(
      and(
        sql`${revisoes.dataPrazo} IS NOT NULL`,
        gte(revisoes.dataPrazo, hoje),
        lt(revisoes.dataPrazo, seteDiasDepois)
      )
    )
    .orderBy(revisoes.dataPrazo);

  // Se não for admin, filtrar por usuário
  if (usuarioId) {
    revisoesQuery = db
      .select({
        revisao: revisoes,
        submissao: submissoes,
        periodico: periodicos,
      })
      .from(revisoes)
      .leftJoin(submissoes, eq(revisoes.submissaoId, submissoes.id))
      .leftJoin(periodicos, eq(submissoes.periodicoId, periodicos.id))
      .where(
        and(
          eq(submissoes.criadorId, usuarioId),
          sql`${revisoes.dataPrazo} IS NOT NULL`,
          gte(revisoes.dataPrazo, hoje),
          lt(revisoes.dataPrazo, seteDiasDepois)
        )
      )
      .orderBy(revisoes.dataPrazo);
  }

  const revisoesResult = await revisoesQuery;

  return {
    submissoes: submissoesResult,
    revisoes: revisoesResult,
  };
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
  const cacheKey = 'dashboard:stats';
  
  return statsCache.getOrSet(cacheKey, async () => {
    const db = await getDb();
    if (!db)
      return {
        totalSubmissoes: 0,
        emAvaliacao: 0,
        aprovadas: 0,
        rejeitadas: 0,
        revisaoSolicitada: 0,
      };

    return measurePerformance("getDashboardStats", async () => {
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
    });
  }, 600000); // Cache por 10 minutos
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

