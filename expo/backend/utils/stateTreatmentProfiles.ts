export type TreatmentIntensity = 'heavy' | 'medium' | 'light' | 'rare';

export interface StateTreatmentProfile {
  intensity: TreatmentIntensity;
  primaryTreatment: 'salt' | 'sand' | 'brine' | 'mixed' | 'minimal';
  description: string;
}

export const STATE_TREATMENT_PROFILES: Record<string, StateTreatmentProfile> = {
  'AL': { intensity: 'rare', primaryTreatment: 'sand', description: 'Minimal winter treatment' },
  'AK': { intensity: 'medium', primaryTreatment: 'sand', description: 'Sand/gravel primary' },
  'AZ': { intensity: 'rare', primaryTreatment: 'minimal', description: 'Limited to mountain areas' },
  'AR': { intensity: 'light', primaryTreatment: 'mixed', description: 'Occasional treatment' },
  'CA': { intensity: 'light', primaryTreatment: 'sand', description: 'Mountain passes only' },
  'CO': { intensity: 'medium', primaryTreatment: 'mixed', description: 'Mag chloride and sand' },
  'CT': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'DE': { intensity: 'medium', primaryTreatment: 'salt', description: 'Moderate salt use' },
  'DC': { intensity: 'medium', primaryTreatment: 'salt', description: 'Moderate salt use' },
  'FL': { intensity: 'rare', primaryTreatment: 'minimal', description: 'Extremely rare treatment' },
  'GA': { intensity: 'rare', primaryTreatment: 'brine', description: 'Rare, brine when needed' },
  'HI': { intensity: 'rare', primaryTreatment: 'minimal', description: 'No winter treatment' },
  'ID': { intensity: 'medium', primaryTreatment: 'mixed', description: 'Sand and salt mix' },
  'IL': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'IN': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'IA': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'KS': { intensity: 'medium', primaryTreatment: 'mixed', description: 'Salt and sand mix' },
  'KY': { intensity: 'medium', primaryTreatment: 'salt', description: 'Moderate salt use' },
  'LA': { intensity: 'rare', primaryTreatment: 'sand', description: 'Rare, sand when needed' },
  'ME': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'MD': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'MA': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'MI': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'MN': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'MS': { intensity: 'rare', primaryTreatment: 'sand', description: 'Minimal treatment' },
  'MO': { intensity: 'medium', primaryTreatment: 'salt', description: 'Moderate salt use' },
  'MT': { intensity: 'medium', primaryTreatment: 'sand', description: 'Sand primary' },
  'NE': { intensity: 'medium', primaryTreatment: 'mixed', description: 'Salt and sand mix' },
  'NV': { intensity: 'light', primaryTreatment: 'sand', description: 'Mountain areas only' },
  'NH': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'NJ': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'NM': { intensity: 'light', primaryTreatment: 'sand', description: 'Sand primary' },
  'NY': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'NC': { intensity: 'light', primaryTreatment: 'brine', description: 'Brine pre-treatment' },
  'ND': { intensity: 'medium', primaryTreatment: 'mixed', description: 'Salt and sand mix' },
  'OH': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'OK': { intensity: 'light', primaryTreatment: 'mixed', description: 'Occasional treatment' },
  'OR': { intensity: 'light', primaryTreatment: 'sand', description: 'Sand and deicers' },
  'PA': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'RI': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'SC': { intensity: 'rare', primaryTreatment: 'brine', description: 'Rare, brine when needed' },
  'SD': { intensity: 'medium', primaryTreatment: 'mixed', description: 'Salt and sand mix' },
  'TN': { intensity: 'light', primaryTreatment: 'brine', description: 'Brine pre-treatment' },
  'TX': { intensity: 'rare', primaryTreatment: 'sand', description: 'Rare, sand/brine' },
  'UT': { intensity: 'medium', primaryTreatment: 'salt', description: 'Moderate salt use' },
  'VT': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'VA': { intensity: 'medium', primaryTreatment: 'salt', description: 'Moderate salt use' },
  'WA': { intensity: 'light', primaryTreatment: 'sand', description: 'Sand and deicers' },
  'WV': { intensity: 'medium', primaryTreatment: 'salt', description: 'Moderate salt use' },
  'WI': { intensity: 'heavy', primaryTreatment: 'salt', description: 'Heavy salt use' },
  'WY': { intensity: 'medium', primaryTreatment: 'sand', description: 'Sand primary' },
};

export function getStateProfile(stateCode: string | null): StateTreatmentProfile {
  if (!stateCode) {
    return { intensity: 'medium', primaryTreatment: 'mixed', description: 'Unknown region' };
  }
  return STATE_TREATMENT_PROFILES[stateCode] || { 
    intensity: 'medium', 
    primaryTreatment: 'mixed', 
    description: 'Unknown region' 
  };
}

export function getTreatmentTerminology(stateCode: string | null): {
  residueTerm: string;
  treatmentTerm: string;
  shortTerm: string;
} {
  const profile = getStateProfile(stateCode);
  
  if (profile.intensity === 'heavy' && profile.primaryTreatment === 'salt') {
    return {
      residueTerm: 'salt residue',
      treatmentTerm: 'road salt',
      shortTerm: 'salt',
    };
  }
  
  return {
    residueTerm: 'treatment residue',
    treatmentTerm: 'winter road treatment',
    shortTerm: 'treatment',
  };
}

export function getRiskMultiplier(intensity: TreatmentIntensity): {
  avoidThreshold: number;
  borderlineThreshold: number;
  maxRiskCap: 'AVOID' | 'BORDERLINE' | 'SAFE' | null;
} {
  switch (intensity) {
    case 'heavy':
      return { avoidThreshold: 1.0, borderlineThreshold: 1.0, maxRiskCap: null };
    case 'medium':
      return { avoidThreshold: 1.2, borderlineThreshold: 1.1, maxRiskCap: null };
    case 'light':
      return { avoidThreshold: 1.5, borderlineThreshold: 1.3, maxRiskCap: 'BORDERLINE' };
    case 'rare':
      return { avoidThreshold: 2.0, borderlineThreshold: 1.5, maxRiskCap: 'BORDERLINE' };
  }
}

export function shouldShowAvoid(
  intensity: TreatmentIntensity,
  hasFreezingRain: boolean,
  hasSustainedFreezing: boolean,
  hasActiveSnow: boolean
): boolean {
  if (intensity === 'heavy' || intensity === 'medium') {
    return true;
  }
  
  if (intensity === 'light') {
    return hasFreezingRain || (hasActiveSnow && hasSustainedFreezing);
  }
  
  if (intensity === 'rare') {
    return hasFreezingRain && hasSustainedFreezing;
  }
  
  return false;
}
