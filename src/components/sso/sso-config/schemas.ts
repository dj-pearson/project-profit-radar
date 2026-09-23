import { z } from 'zod';

// SAML Configuration Schema
export const samlConfigSchema = z.object({
  display_name: z.string().min(1, 'Display name is required'),
  entity_id: z.string().min(1, 'Entity ID is required'),
  sso_url: z.string().url('Invalid SSO URL'),
  slo_url: z.string().url('Invalid SLO URL').optional().or(z.literal('')),
  certificate: z.string().min(1, 'Certificate is required'),
  sign_request: z.boolean().default(false),
  want_assertions_signed: z.boolean().default(true),
  allowed_domains: z.string().optional(),
  default_role: z.string().default('office_staff'),
  is_enabled: z.boolean().default(false),
  is_default: z.boolean().default(false),
});

// OAuth Configuration Schema
export const oauthConfigSchema = z.object({
  display_name: z.string().min(1, 'Display name is required'),
  provider: z.enum(['oauth_google', 'oauth_microsoft', 'oauth_github']),
  client_id: z.string().min(1, 'Client ID is required'),
  client_secret: z.string().min(1, 'Client Secret is required'),
  authorize_url: z.string().url('Invalid authorize URL').optional().or(z.literal('')),
  token_url: z.string().url('Invalid token URL').optional().or(z.literal('')),
  scopes: z.string().optional(),
  allowed_domains: z.string().optional(),
  default_role: z.string().default('office_staff'),
  is_enabled: z.boolean().default(false),
  is_default: z.boolean().default(false),
});

// LDAP Configuration Schema
export const ldapConfigSchema = z.object({
  display_name: z.string().min(1, 'Display name is required'),
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().int().min(1).max(65535).default(389),
  use_ssl: z.boolean().default(false),
  bind_dn: z.string().min(1, 'Bind DN is required'),
  bind_password: z.string().min(1, 'Bind password is required'),
  user_search_base: z.string().min(1, 'User search base is required'),
  user_search_filter: z.string().default('(uid={username})'),
  group_search_base: z.string().optional(),
  email_attribute: z.string().default('mail'),
  name_attribute: z.string().default('cn'),
  allowed_domains: z.string().optional(),
  default_role: z.string().default('office_staff'),
  is_enabled: z.boolean().default(false),
  is_default: z.boolean().default(false),
});

export type SAMLConfig = z.infer<typeof samlConfigSchema>;
export type OAuthConfig = z.infer<typeof oauthConfigSchema>;
export type LDAPConfig = z.infer<typeof ldapConfigSchema>;
