// Plan-based tenant limits
export const PLAN_LIMITS = {
  starter: {
    maxUsers: 3,
    maxAgents: 5,
    maxPhoneNumbers: 1,
    maxCallsPerMonth: 100,
    maxCampaigns: 2,
    features: ['basic_analytics', 'email_support']
  },
  pro: {
    maxUsers: 10,
    maxAgents: 20,
    maxPhoneNumbers: 5,
    maxCallsPerMonth: 1000,
    maxCampaigns: 10,
    features: ['advanced_analytics', 'priority_support', 'api_access', 'webhooks']
  },
  enterprise: {
    maxUsers: -1, // unlimited
    maxAgents: -1,
    maxPhoneNumbers: -1,
    maxCallsPerMonth: -1,
    maxCampaigns: -1,
    features: ['all_features', 'dedicated_support', 'custom_integration', 'sla']
  }
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan as PlanType] || PLAN_LIMITS.starter;
}

export function canCreateResource(
  currentCount: number, 
  plan: string, 
  resourceType: keyof typeof PLAN_LIMITS.starter
): { allowed: boolean; limit: number; message?: string } {
  const limits = getPlanLimits(plan);
  const limit = limits[resourceType] as number;
  
  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, limit: -1 };
  }
  
  if (currentCount >= limit) {
    return {
      allowed: false,
      limit,
      message: `Plan limit reached. Your ${plan} plan allows ${limit} ${resourceType}. Upgrade to create more.`
    };
  }
  
  return { allowed: true, limit };
}

export function hasFeature(plan: string, feature: string): boolean {
  const limits = getPlanLimits(plan);
  return (limits.features as readonly string[]).includes(feature) || (limits.features as readonly string[]).includes('all_features');
}
