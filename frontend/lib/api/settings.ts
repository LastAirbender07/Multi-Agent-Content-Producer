import { BASE } from "./client";

export interface SettingsBrand {
  brand_name: string;
  instagram_url: string;
  instagram_handle: string;
  medium_url: string;
  blogger_url?: string;
}

export interface SettingsContentDefaults {
  max_slides: number;
  min_slides: number;
  research_mode: string;
  research_freshness: string;
}

export interface SettingsApiKeys {
  pexels_api_key: string;   // always masked from GET
  newsapi_api_key: string;  // always masked from GET
}

export interface SettingsResponse {
  brand: SettingsBrand;
  content_defaults: SettingsContentDefaults;
  api_keys: SettingsApiKeys;
  api_keys_configured: { pexels: boolean; newsapi: boolean };
}

export const settings = {
  getSettings: (): Promise<SettingsResponse> =>
    fetch(`${BASE}/settings/`).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),

  updateSettings: (patch: Record<string, unknown>): Promise<SettingsResponse> =>
    fetch(`${BASE}/settings/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),
};
