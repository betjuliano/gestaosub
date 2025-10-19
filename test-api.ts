import { drizzle } from "drizzle-orm/mysql2";
import * as db from "./server/db";

async function testAPIs() {
  console.log("🧪 Testando APIs do sistema...\n");

  try {
    // 1. Testar Dashboard Stats
    console.log("1️⃣ Testando Dashboard Stats...");
    const stats = await db.getDashboardStats();
    console.log("✅ Stats:", stats);

    // 2. Testar Listagem de Periódicos
    console.log("\n2️⃣ Testando Listagem de Periódicos...");
    const periodicos = await db.getAllPeriodicos();
    console.log(`✅ ${periodicos.length} periódicos encontrados`);

    // 3. Testar Busca de Periódicos
    console.log("\n3️⃣ Testando Busca de Periódicos...");
    const busca = await db.searchPeriodicos("Computer");
    console.log(`✅ ${busca.length} periódicos encontrados na busca`);

    // 4. Testar Listagem de Submissões
    console.log("\n4️⃣ Testando Listagem de Submissões...");
    const submissoes = await db.getAllSubmissoes();
    console.log(`✅ ${submissoes.length} submissões encontradas`);

    // 5. Testar Listagem de Revisões
    console.log("\n5️⃣ Testando Listagem de Revisões...");
    const revisoes = await db.getAllRevisoes();
    console.log(`✅ ${revisoes.length} revisões encontradas`);

    // 6. Testar Periódicos Mais Utilizados
    console.log("\n6️⃣ Testando Periódicos Mais Utilizados...");
    const maisUtilizados = await db.getPeriodicosMaisUtilizados(5);
    console.log(`✅ ${maisUtilizados.length} periódicos mais utilizados`);

    console.log("\n✅ Todos os testes passaram com sucesso!");
  } catch (error) {
    console.error("\n❌ Erro nos testes:", error);
    process.exit(1);
  }
}

testAPIs()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
