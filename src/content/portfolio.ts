export type ProjectStatus =
  "Live" | "In production" | "MVP" | "Beta" | "In development" | "Freelance";

export interface Project {
  name: string;
  status: ProjectStatus;
  tags: string[];
  desc: string;
  url?: string; // optional: add a live link later
  image?: string; // optional: add a screenshot later
}

export interface Skill {
  name: string;
  level: number; // out of 10
  label: "Advanced" | "Proficient" | "Growing";
}

export interface ExperienceItem {
  period: string;
  role: string;
  org: string;
}

export const PROFILE = {
  name: "Momen Shili",
  initials: "MS",
  title: "Full-stack developer",
  location: "Hammam-Lif, Tunis",
  languages: ["Arabic", "French", "English"],
  bio:
    "I build web platforms, e-commerce stores and internal tools for Tunisian companies, " +
    "and I lead cybersecurity on an autonomous AI red-team product. " +
    "Former CIO of NaroTeam SARL. I work in Arabic, French and English.",
  short:
    "Momen Shili - full-stack developer from Tunis. E-commerce, SaaS, AI agents and cybersecurity.",
} as const;

export const LINKS = {
  email: "contact@momenshili.app",
  linkedin: "https://linkedin.com/in/momen-shili",
  github: "https://github.com/Momen-Shili",
} as const;

export const PROJECTS: Project[] = [
  {
    name: "Tunexa",
    status: "Live",
    tags: ["PHP", "CodeIgniter 4", "MySQL"],
    desc: "Enterprise project-management SaaS built for teams in the MENA region.",
  },
  {
    name: "Atable",
    status: "Live",
    tags: ["SaaS", "Multi-tenant", "POS"],
    desc: "Restaurant, hotel and café management platform for Tunisian businesses (atable.tn).",
  },
  {
    name: "NaroOps",
    status: "In production",
    tags: ["Laravel 12", "React", "Inertia", "Groq/Llama"],
    desc: "Unified ERP and helpdesk for NaroTeam, with an AI assistant named NARO.",
  },
  {
    name: "Penturom AI",
    status: "MVP",
    tags: ["FastAPI", "LangGraph", "Ollama", "Next.js"],
    desc: "Autonomous AI red-team platform that attacks your infrastructure before hackers do. Cybersecurity lead.",
  },
  {
    name: "Mentra",
    status: "Beta",
    tags: ["Next.js 14", "Supabase"],
    desc: "Skill-exchange marketplace with swipe feed, real-time chat and session logging.",
  },
  {
    name: "Dari (دار)",
    status: "In development",
    tags: ["PropTech", "Supabase", "PostGIS"],
    desc: "Real-estate rental platform with tenant, owner and agency plans.",
  },
  {
    name: "E-commerce Work",
    status: "Freelance",
    tags: ["WooCommerce", "PrestaShop", "GTM"],
    desc: "Stores, custom modules and tracking setups (metashoptn.com, gamezonehammam-lif.com). Contributor on the MyTek.tn migration from PrestaShop to Magento.",
  },
];

export const SKILLS: Skill[] = [
  { name: "WooCommerce / WordPress", level: 9, label: "Advanced" },
  { name: "PHP / Laravel", level: 8, label: "Advanced" },
  { name: "JavaScript / TypeScript", level: 8, label: "Advanced" },
  { name: "React / Next.js", level: 8, label: "Advanced" },
  { name: "Tracking (GTM, dataLayer)", level: 8, label: "Advanced" },
  { name: "Node.js", level: 7, label: "Proficient" },
  { name: "PrestaShop / Magento", level: 7, label: "Proficient" },
  { name: "Python / FastAPI", level: 7, label: "Proficient" },
  { name: "Linux VPS / Docker", level: 7, label: "Proficient" },
  { name: "LLM agents (LangGraph)", level: 6, label: "Growing" },
  { name: "Web security", level: 6, label: "Growing" },
];

export const EXPERIENCE: ExperienceItem[] = [
  { period: "2025 - now", role: "Cybersecurity lead", org: "Penturom AI" },
  { period: "2023 - 2025", role: "CIO", org: "NaroTeam SARL" },
  { period: "2021 - 2023", role: "Junior Developer", org: "NaroTeam SARL" },
  { period: "2021", role: "Platform migration, modules", org: "MyTek.tn" },
];
