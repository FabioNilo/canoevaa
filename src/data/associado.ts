export type Member = {
  nome: string;
  plano: string;
  cotasDisponiveis: number;
  cotasSemana: number;
  vencimento: string;
  proximaRenovacao: string;
  status: "ativo" | "pendente";
};

export const associado: Member = {
  nome: "Fabio",
  plano: "Plano Aloha",
  cotasDisponiveis: 3,
  cotasSemana: 3,
  vencimento: "15/11/2026",
  proximaRenovacao: "segunda-feira",
  status: "ativo",
};
