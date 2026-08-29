export type ApiError = {
  code: string;
  message: string;
  field?: string;
};

export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
  meta?: Record<string, unknown>;
};

export type UserRole = "public" | "member" | "admin";

export type ExperienceKind = "regular" | "celebration" | "expedition";
export type ExperienceScheduleMode = "daily_default" | "manual";
export type ExperienceBookingChannel = "online" | "request";

export type ExperienceBookingPolicy = {
  channel: ExperienceBookingChannel;
  canReserveOnline: boolean;
  canGenerateDefaultSchedule: boolean;
  publicLabel: string;
  adminLabel: string;
  reason?: string;
};

export type ExperienceImage = {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  objectPosition?: string;
};

export type Experience = {
  id: string;
  slug: string;
  name: string;
  kind: ExperienceKind;
  shortDescription: string;
  description: string;
  priceCents: number;
  currency: "BRL";
  durationMinutes: number;
  scheduleLabel: string;
  scheduleMode: ExperienceScheduleMode;
  minParticipants: number;
  maxParticipants: number;
  meetingPoint: string;
  difficulty: "iniciante" | "intermediario" | "avancado";
  quotaCost: number;
  imageClass: string;
  availableTimes: string[];
  includedItems: string[];
  guidance: string[];
  safetyNotes: string[];
  galleryImages: ExperienceImage[];
  isActive: boolean;
};

export type Expedition = {
  id: string;
  slug: string;
  name: string;
  destination: string;
  description: string;
  startingPriceCents: number;
  minParticipants: number;
  maxParticipants: number;
  isActive: boolean;
};

export type AvailabilityStatus = "available" | "low" | "full" | "unavailable";

export type AvailabilitySlot = {
  id: string;
  experienceSlug: string;
  date: string;
  time: string;
  startsAt?: string;
  canoeId?: string;
  canoes?: ScheduleSlotCanoe[];
  capacityTotal: number;
  booked: number;
  occupiedSpots: number;
  pendingParticipants: number;
  availableSpots: number;
  minimumParticipants: number;
  confirmedParticipants: number;
  remainingToMinimum: number;
  hasMinimumParticipants: boolean;
  status: AvailabilityStatus;
};

export type Customer = {
  fullName: string;
  rg: string;
  cpf?: string;
  birthDate?: string;
  phone: string;
  email?: string;
  address?: string;
  willParticipate?: boolean;
};

export type Participant = {
  id: string;
  fullName: string;
  rg: string;
  cpf?: string;
  birthDate?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  legalGuardian?: {
    fullName: string;
    cpf: string;
    phone: string;
    authorizationAccepted: boolean;
  };
  termsAccepted: boolean;
};

export type PaymentMethod = "pix" | "card" | "in_person";
export type PaymentStatus = "pending" | "waiting_payment" | "confirmed" | "expired" | "error";

export type Payment = {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  dueAt: string;
  pixCopyPaste?: string;
  pixQrCodeUrl?: string;
};

export type ReservationDraft = {
  experienceSlug: string;
  scheduleSlotId?: string;
  date: string;
  time: string;
  participantsCount: number;
  customer: Customer;
  participants: Participant[];
  paymentMethod: PaymentMethod;
  acceptedTermsVersion: string;
};

export type ReservationQuote = {
  experienceSlug: string;
  unitPriceCents: number;
  participantsCount: number;
  totalCents: number;
  currency: "BRL";
  quotaCost: number;
  minimumParticipantsToRun: number;
  valid: boolean;
  errors: ApiError[];
};

export type ReservationStatus =
  | "waiting_payment"
  | "confirmed"
  | "cancellation_requested"
  | "cancelled"
  | "credit_granted"
  | "refunded"
  | "completed"
  | "no_show";

export type Reservation = {
  id: string;
  code: string;
  experienceSlug: string;
  experienceName: string;
  date: string;
  time: string;
  participantsCount: number;
  customer: Customer;
  participants: Participant[];
  quote: ReservationQuote;
  payment: Payment;
  status: ReservationStatus;
  createdAt: string;
};

export type MemberStatus = "active" | "payment_pending" | "overdue" | "suspended" | "cancelled";

export type MemberPlan = {
  id: string;
  name: string;
  monthlyPriceCents: number;
  weeklyQuota: number;
  quotasAccumulate: boolean;
};

export type QuotaMovement = {
  id: string;
  date: string;
  type: "renewal" | "reservation_use" | "cancellation_return" | "manual_adjustment";
  quantity: number;
  reservationCode?: string;
  previousBalance: number;
  nextBalance: number;
  description: string;
};

export type MemberDashboard = {
  member: {
    id: string;
    name: string;
    status: MemberStatus;
    invoiceDueDate: string;
    nextRenewalLabel: string;
  };
  plan: MemberPlan;
  quotasAvailable: number;
  quotaMovements: QuotaMovement[];
  nextReservation: Reservation | null;
};

export type Canoe = {
  id: string;
  name: string;
  capacity: number;
  isActive: boolean;
  status: "available" | "reserved" | "in_use" | "maintenance" | "unavailable";
};

export type CreateCanoeInput = {
  name: string;
  capacity: number;
  isActive: boolean;
};

export type UpdateCanoeInput = Partial<CreateCanoeInput>;

export type MutationResult = {
  id: string;
  deleted: boolean;
};

export type ScheduleSlotCanoe = {
  id: string;
  canoeId: string;
  canoeName: string;
  capacity: number;
};

export type ScheduleSlotCanoeInput = {
  canoeId: string;
  capacity: number;
};

export type ScheduleSlot = Omit<AvailabilitySlot, "status"> & {
  experienceName: string;
  status: AvailabilityStatus | "blocked" | "cancelled";
  blockedReason?: string;
  adminNotes?: string;
  meetingPointOverride?: string;
  priceOverrideCents?: number;
  bookingCutoffAt?: string;
};

export type CreateScheduleSlotInput = {
  experienceSlug: string;
  date: string;
  time: string;
  capacityTotal?: number;
  canoeId?: string;
  canoes?: ScheduleSlotCanoeInput[];
  blockedReason?: string;
  adminNotes?: string;
  meetingPointOverride?: string;
  priceOverrideCents?: number;
  bookingCutoffAt?: string;
};

export type CreateExperienceInput = {
  name: string;
  slug: string;
  kind: ExperienceKind;
  shortDescription: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
  scheduleLabel: string;
  scheduleMode: ExperienceScheduleMode;
  meetingPoint: string;
  difficulty: Experience["difficulty"];
  quotaCost: number;
  imageClass: string;
  availableTimes: string[];
  includedItems: string[];
  guidance: string[];
  safetyNotes: string[];
  minParticipants: number;
  maxParticipants: number;
  isActive: boolean;
};

export type UpdateExperienceInput = Partial<CreateExperienceInput>;

export type GenerateScheduleInput = {
  experienceSlug: string;
  startDate: string;
  daysAhead: number;
  canoes?: ScheduleSlotCanoeInput[];
};

export type GenerateScheduleResult = {
  created: number;
  skipped: number;
  slots: ScheduleSlot[];
};

export type UpdateScheduleSlotInput = {
  status?: "open" | "blocked" | "cancelled";
  date?: string;
  time?: string;
  capacityTotal?: number;
  canoes?: ScheduleSlotCanoeInput[];
  blockedReason?: string | null;
  adminNotes?: string | null;
  meetingPointOverride?: string | null;
  priceOverrideCents?: number | null;
  bookingCutoffAt?: string | null;
};

export type TermVersion = {
  id: string;
  name: string;
  version: string;
  content: string;
  effectiveFrom: string;
  status: "draft" | "active" | "archived";
};

export type Credit = {
  id: string;
  customerId: string;
  originReservationCode: string;
  initialAmountCents: number;
  balanceCents: number;
  expiresAt: string;
  status: "available" | "partially_used" | "used" | "expired" | "cancelled";
};

export type Cancellation = {
  id: string;
  reservationCode: string;
  reason: "force_majeure" | "customer_request" | "weather" | "other";
  notes: string;
  outcome: "refund" | "credit" | "denied" | "pending";
};

export type CancellationPolicy = {
  id: string;
  name: string;
  freeCancellationHours: number;
  creditUntilHours: number;
  active: boolean;
};

export type AdminPermission = "reservations" | "finance" | "members";

export type AdminUser = {
  id: string;
  name: string;
  role: "admin" | "instructor" | "support";
  permissions: Record<AdminPermission, boolean>;
};

export type AdminDashboardMode = "today" | "week";

export type AdminDashboardMetrics = {
  pendingReservations: number;
  confirmedParticipants: number;
  availableSpots: number;
  activeReservations: number;
  confirmedRevenueCents: number;
};

export type AdminDashboardDay = {
  date: string;
  slots: ScheduleSlot[];
  reservations: Reservation[];
  pendingReservations: number;
  confirmedParticipants: number;
  availableSpots: number;
  activeReservations: number;
  confirmedRevenueCents: number;
};

export type AdminDashboardOverview = {
  mode: AdminDashboardMode;
  startDate: string;
  endDate: string;
  metrics: AdminDashboardMetrics;
  days: AdminDashboardDay[];
  schedule: ScheduleSlot[];
  reservations: Reservation[];
};

export type AdminOverview = {
  reservationsToday: number;
  participantsToday: number;
  availableSpotsToday: number;
  confirmedRevenueCents: number;
  pendingPayments: number;
  activeMembers: number;
  confirmations: Reservation[];
  schedule: ScheduleSlot[];
  experiences: Experience[];
  users: AdminUser[];
};
