// Stripe Configuration - Generated 2025-12-27 23:12:23
// Copy this to your configuration file

export const STRIPE_CONFIG = {
  products: {
    starter: 'prod_TgZPvcaNMyNK8o',
    professional: 'prod_TgZPtFGrycq2bv',
    enterprise: 'prod_TgZQQqJsaHwTvp',
  },
  prices: {
    starter_monthly: 'price_1SjCH3EEswwWFq6K0ZkPd6yn',
    starter_annual: 'price_1SjCH5EEswwWFq6K9mfzwZk7',
    professional_monthly: 'price_1SjCH7EEswwWFq6KSDtkAs3H',
    professional_annual: 'price_1SjCH8EEswwWFq6K7GVWgaVJ',
    enterprise_monthly: 'price_1SjCHAEEswwWFq6KB1iPFWHp',
    enterprise_annual: 'price_1SjCHCEEswwWFq6KBCpC1lVw',
  },
  paymentLinks: {
    starter_monthly: 'https://buy.stripe.com/6oUbJ14z4gAV8gd4T56wE00',
    starter_annual: 'https://buy.stripe.com/28E28rc1wdoJ9kh99l6wE01',
    professional_monthly: 'https://buy.stripe.com/28EaEX6Hc1G1eEBdpB6wE02',
    professional_annual: 'https://buy.stripe.com/4gM4gzaXsgAVgMJadp6wE03',
    enterprise_monthly: 'https://buy.stripe.com/dRm28r6Hc98t9khclx6wE04',
    enterprise_annual: 'https://buy.stripe.com/eVq7sLc1w2K59khadp6wE05',
  }
} as const;

// Environment variables to add to Supabase Edge Functions:
// STRIPE_PRICE_STARTER_MONTHLY=price_1SjCH3EEswwWFq6K0ZkPd6yn
// STRIPE_PRICE_STARTER_ANNUAL=price_1SjCH5EEswwWFq6K9mfzwZk7
// STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_1SjCH7EEswwWFq6KSDtkAs3H
// STRIPE_PRICE_PROFESSIONAL_ANNUAL=price_1SjCH8EEswwWFq6K7GVWgaVJ
// STRIPE_PRICE_ENTERPRISE_MONTHLY=price_1SjCHAEEswwWFq6KB1iPFWHp
// STRIPE_PRICE_ENTERPRISE_ANNUAL=price_1SjCHCEEswwWFq6KBCpC1lVw
