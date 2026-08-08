export type Experience = {
  nome: string;
  slug: string;
  descricao: string;
  detalhe: string;
  preco: number;
  duracao: string;
  dificuldade: "Iniciante" | "Intermediario";
  cotas: number;
  imagemClasse: string;
  horarios: string[];
  incluso: string[];
};

export const experiencias: Experience[] = [
  {
    nome: "Batismo no Mar",
    slug: "batismo-no-mar",
    descricao: "A introducao perfeita a canoa havaiana, em aguas calmas e com instrucao completa.",
    detalhe:
      "Uma remada leve para sentir o ritmo da canoa, aprender os movimentos basicos e ver Ilheus por um angulo novo.",
    preco: 35,
    duracao: "1h15",
    dificuldade: "Iniciante",
    cotas: 1,
    imagemClasse: "canoe-sunrise",
    horarios: ["06:00", "07:30", "16:00"],
    incluso: ["Colete", "Instrucao", "Guia experiente"],
  },
  {
    nome: "Remada Costeira",
    slug: "por-do-sol",
    descricao: "Explore as praias e encostas de Ilheus em uma rota revigorante no por do sol.",
    detalhe:
      "Uma experiencia mais completa, com ritmo moderado, paisagem aberta e chegada em clima dourado.",
    preco: 65,
    duracao: "2h",
    dificuldade: "Intermediario",
    cotas: 2,
    imagemClasse: "canoe-coast",
    horarios: ["05:30", "15:30", "16:30"],
    incluso: ["Colete", "Remo", "Monitoramento de clima", "Guia experiente"],
  },
];

export const experienciaDestaque = experiencias[1];
