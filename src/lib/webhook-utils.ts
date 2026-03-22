import type {
  ManyChatWebhookPayload,
  ManyChatCustomFields,
} from '@/types/manychat';
import type {
  LeadType,
  SourcePlatform,
  LeadMetadata,
  VocalLessonMetadata,
  ChuppahMetadata,
  PrivateEventMetadata,
  ModelingMetadata,
} from '@/types/database';

// ------------------------------------------------------------
// Payload validation
// ------------------------------------------------------------

export function validateManyChatPayload(body: unknown): {
  valid: boolean;
  data?: ManyChatWebhookPayload;
  error?: string;
} {
  if (body === null || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.subscriber_id !== 'string' || obj.subscriber_id.trim() === '') {
    return { valid: false, error: 'subscriber_id is required' };
  }

  const hasName =
    (typeof obj.first_name === 'string' && obj.first_name.trim() !== '') ||
    (typeof obj.name === 'string' && obj.name.trim() !== '');

  if (!hasName) {
    return { valid: false, error: 'name or first_name is required' };
  }

  return { valid: true, data: obj as unknown as ManyChatWebhookPayload };
}

// ------------------------------------------------------------
// Enum mappers
// ------------------------------------------------------------

const SOURCE_MAP: Record<string, SourcePlatform> = {
  whatsapp: 'whatsapp',
  instagram: 'instagram',
  tiktok: 'tiktok',
  website: 'website',
  referral: 'referral',
};

export function mapSource(source?: string): SourcePlatform {
  if (!source) return 'other';
  return SOURCE_MAP[source.toLowerCase().trim()] ?? 'other';
}

const LEAD_TYPE_SET: Set<string> = new Set<LeadType>([
  'vocal_lesson',
  'chuppah',
  'private_event',
  'modeling',
  'other',
]);

export function mapLeadType(leadType?: string): LeadType {
  if (!leadType) return 'other';
  const normalised = leadType.toLowerCase().trim();
  if (LEAD_TYPE_SET.has(normalised)) return normalised as LeadType;
  return 'other';
}

// ------------------------------------------------------------
// Metadata extraction
// ------------------------------------------------------------

export function parseLeadMetadata(
  customFields: ManyChatCustomFields | undefined,
  leadType: LeadType,
): LeadMetadata {
  if (!customFields) return {};

  switch (leadType) {
    case 'vocal_lesson': {
      const meta: VocalLessonMetadata = {};
      if (customFields.gender) meta.gender = customFields.gender;
      if (customFields.age) {
        const parsed = parseInt(customFields.age, 10);
        if (!Number.isNaN(parsed)) meta.age = parsed;
      }
      if (customFields.experience) meta.experience = customFields.experience;
      if (customFields.location_preference) {
        const loc = customFields.location_preference.toLowerCase().trim();
        if (loc === 'zoom' || loc === 'in_person') {
          meta.location_preference = loc;
        }
      }
      return meta;
    }

    case 'chuppah': {
      const meta: ChuppahMetadata = {};
      if (customFields.venue) meta.venue = customFields.venue;
      if (customFields.preferred_song) meta.preferred_song = customFields.preferred_song;
      if (customFields.style) meta.style = customFields.style;
      if (customFields.event_date) meta.date = customFields.event_date;
      return meta;
    }

    case 'private_event': {
      const meta: PrivateEventMetadata = {};
      if (customFields.event_type) meta.event_type = customFields.event_type;
      if (customFields.occasion) meta.occasion = customFields.occasion;
      if (customFields.requirements) meta.requirements = customFields.requirements;
      return meta;
    }

    case 'modeling': {
      const meta: ModelingMetadata = {};
      if (customFields.project_type) meta.project_type = customFields.project_type;
      if (customFields.brand) meta.brand = customFields.brand;
      if (customFields.requirements) meta.requirements = customFields.requirements;
      return meta;
    }

    default: {
      // Return all custom fields as-is for 'other'
      const { lead_type: _lt, ...rest } = customFields;
      return rest as Record<string, unknown>;
    }
  }
}

// ------------------------------------------------------------
// Payload → Contact shape
// ------------------------------------------------------------

function cleanPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/[\s\-()]/g, '').trim();
  return cleaned || undefined;
}

export function mapManyChatToContact(payload: ManyChatWebhookPayload): {
  full_name: string;
  phone?: string;
  email?: string;
  manychat_subscriber_id: string;
} {
  let fullName: string;
  if (payload.first_name) {
    fullName = payload.last_name
      ? `${payload.first_name.trim()} ${payload.last_name.trim()}`
      : payload.first_name.trim();
  } else {
    fullName = (payload.name ?? '').trim();
  }

  return {
    full_name: fullName,
    phone: cleanPhone(payload.phone),
    email: payload.email?.trim() || undefined,
    manychat_subscriber_id: payload.subscriber_id,
  };
}

// ------------------------------------------------------------
// Payload → Lead shape (minus contact_id added later)
// ------------------------------------------------------------

export function mapManyChatToLead(
  payload: ManyChatWebhookPayload,
  contactId: string,
): {
  contact_id: string;
  lead_type: LeadType;
  source_platform: SourcePlatform;
  manychat_subscriber_id: string;
  metadata: LeadMetadata;
} {
  const leadType = mapLeadType(payload.custom_fields?.lead_type);

  return {
    contact_id: contactId,
    lead_type: leadType,
    source_platform: mapSource(payload.source),
    manychat_subscriber_id: payload.subscriber_id,
    metadata: parseLeadMetadata(payload.custom_fields, leadType),
  };
}
