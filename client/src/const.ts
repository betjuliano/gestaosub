export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "Sistema de Gestão Acadêmica";

export const APP_LOGO =
  import.meta.env.VITE_APP_LOGO ||
  "https://placehold.co/128x128/E1E7EF/1F2937?text=App";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

export const STATUS_LABELS: Record<string, string> = {
  EM_AVALIACAO: "Em Avaliação",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
  REVISAO_SOLICITADA: "Revisão Solicitada",
  SUBMETIDO_NOVAMENTE: "Submetido Novamente",
};

export const STATUS_COLORS: Record<string, string> = {
  EM_AVALIACAO: "text-yellow-600 bg-yellow-50 border-yellow-200",
  APROVADO: "text-green-600 bg-green-50 border-green-200",
  REJEITADO: "text-red-600 bg-red-50 border-red-200",
  REVISAO_SOLICITADA: "text-blue-600 bg-blue-50 border-blue-200",
  SUBMETIDO_NOVAMENTE: "text-purple-600 bg-purple-50 border-purple-200",
};

export const QUALIS_LABELS: Record<string, string> = {
  muito_bom: "Muito Bom",
  bom: "Bom",
  fraco: "Fraco",
  sem_classificacao: "Sem Classificação",
};

export const NIVEL_FORMACAO_LABELS: Record<string, string> = {
  graduacao: "Graduação",
  mestrado: "Mestrado",
  doutorado: "Doutorado",
  pos_doutorado: "Pós-Doutorado",
};

export const LLM_PROVIDERS: Record<string, string> = {
  openai: "OpenAI",
  gemini: "Google Gemini",
  groq: "Groq",
  deepseek: "DeepSeek",
  qwen: "Qwen",
  ollama: "Ollama",
  claude: "Anthropic Claude",
  glm: "GLM",
  grok: "xAI Grok",
};

export const PADRAO_FORMATACAO_LABELS: Record<string, string> = {
  APA: "APA",
  NBR6023: "NBR 6023",
  Chicago: "Chicago",
  Harvard: "Harvard",
  Outra: "Outra",
};

// URL externa para pesquisa de periódicos
export const PERIODICOS_SEARCH_URL = "https://periodicos.iaprojetos.com.br";