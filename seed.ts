import { drizzle } from "drizzle-orm/mysql2";
import { periodicos, submissoes, autores, revisoes } from "./drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log("🌱 Iniciando seed...");

  // Criar periódicos
  const periodicoIds = [];
  
  const p1 = await db.insert(periodicos).values({
    nome: "Journal of Computer Science",
    issn: "1234-5678",
    area: "Ciência da Computação",
    qualis: "A1",
    descricao: "Periódico internacional de alto impacto em ciência da computação",
  });
  periodicoIds.push(crypto.randomUUID());

  const p2 = await db.insert(periodicos).values({
    nome: "Management Review",
    issn: "8765-4321",
    area: "Administração",
    qualis: "A2",
    descricao: "Revista de gestão e administração empresarial",
  });
  periodicoIds.push(crypto.randomUUID());

  const p3 = await db.insert(periodicos).values({
    nome: "Education Research Quarterly",
    issn: "5555-1111",
    area: "Educação",
    qualis: "B1",
    descricao: "Pesquisas em educação e pedagogia",
  });
  periodicoIds.push(crypto.randomUUID());

  console.log("✅ Periódicos criados!");
  console.log("✅ Seed concluído!");
}

seed()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
