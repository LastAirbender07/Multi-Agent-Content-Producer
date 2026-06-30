import { post } from "./client";
import type { AngleRequestBody, AngleResponse, ResearchSynthesis } from "./types";

export const angles = {
  runAngle: (body: AngleRequestBody) =>
    post<AngleResponse>("/angle/run", body),

  regenerateAngles: (body: AngleRequestBody) =>
    post<AngleResponse>("/angle/regenerate", body),

  selectAngles: (runId: string, indices: number[]) =>
    post<AngleResponse>(`/angle/${runId}/select`, { angle_indices: indices }),
};
