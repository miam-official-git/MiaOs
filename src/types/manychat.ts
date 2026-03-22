// ============================================================
// ManyChat webhook payload types
// ============================================================

export interface ManyChatCustomFields {
  // Common
  lead_type?: string;

  // Vocal lesson specific
  gender?: string;
  age?: string; // ManyChat sends as string
  experience?: string;
  location_preference?: string;

  // Chuppah specific
  venue?: string;
  preferred_song?: string;
  style?: string;
  event_date?: string;

  // Private event specific
  event_type?: string;
  occasion?: string;
  requirements?: string;

  // Modeling specific
  project_type?: string;
  brand?: string;
}

export interface ManyChatWebhookPayload {
  subscriber_id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  phone?: string;
  email?: string;
  gender?: string;
  custom_fields?: ManyChatCustomFields;
  source?: string;
  last_interaction?: string;
}

export interface WebhookResponse {
  success: boolean;
  lead_id?: string;
  status?: string;
  rejection_reason?: string | null;
  error?: string;
}
