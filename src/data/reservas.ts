export type Reservation = {
  codigo: string;
  experiencia: string;
  data: string;
  horario: string;
  participantes: number;
  status: "confirmada" | "concluida" | "cancelada";
};

export const reservas: Reservation[] = [
  {
    codigo: "NK-2408",
    experiencia: "Nascer do Sol",
    data: "12/08/2026",
    horario: "05:30",
    participantes: 1,
    status: "confirmada",
  },
  {
    codigo: "NK-1821",
    experiencia: "Por do Sol",
    data: "28/07/2026",
    horario: "16:30",
    participantes: 2,
    status: "concluida",
  },
];
