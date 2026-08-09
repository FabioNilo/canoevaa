import type { AvailabilitySlot, Experience } from "@/domain/types";
import { apiRequest } from "./api-client";

export const experienceService = {
  list() {
    return apiRequest<Experience[]>("/api/experiences");
  },

  getBySlug(slug: string) {
    return apiRequest<Experience>(`/api/experiences/${slug}`);
  },

  availability(experienceSlug?: string) {
    const params = experienceSlug ? `?experienceSlug=${encodeURIComponent(experienceSlug)}` : "";
    return apiRequest<AvailabilitySlot[]>(`/api/availability${params}`);
  },
};
