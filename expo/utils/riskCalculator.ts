import type { RoadTreatmentData, TreatmentStatus } from './roadTreatmentService';
import { 
  getStateProfile, 
  getTreatmentTerminology, 
  shouldShowAvoid,
  type TreatmentIntensity 
} from './stateTreatmentProfiles';

export type RiskVerdict = 'SAFE' | 'BORDERLINE' | 'AVOID';

export interface WeatherCondition {
  lastColdPrecipitation: Date | null;
  lastWarmRain: Date | null; // Rain above 40°F that washes salt
  lastRain: Date | null;
  currentTemp: number;
  recentLowTemp: number;
  recentHighTemp: number;
  precipitationType: 'snow' | 'sleet' | 'freezing-rain' | 'rain' | 'none';
  totalRainLast48Hours: number; // inches
  hoursAboveFreezing: number; // consecutive hours above 32°F
}

export interface RiskAssessment {
  verdict: RiskVerdict;
  explanation: string;
  details: {
    lastColdPrecipEvent: string;
    timeSinceRain: string;
    temperatureTrend: string;
    roadTreatment: string | null;
  };
  roadTreatmentData: RoadTreatmentData | null;
  stateCode: string | null;
  treatmentIntensity: TreatmentIntensity;
}

function getHoursSince(date: Date | null): number {
  if (!date) return Infinity;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

function getDaysSince(date: Date | null): number {
  if (!date) return Infinity;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

export function calculateRisk(
  conditions: WeatherCondition,
  roadTreatment?: RoadTreatmentData | null,
  stateCode?: string | null
): RiskAssessment {
  const hoursSinceColdPrecip = getHoursSince(conditions.lastColdPrecipitation);
  const hoursSinceWarmRain = getHoursSince(conditions.lastWarmRain);
  const daysSinceColdPrecip = getDaysSince(conditions.lastColdPrecipitation);

  const stateProfile = getStateProfile(stateCode || null);
  const terminology = getTreatmentTerminology(stateCode || null);
  const { residueTerm, treatmentTerm } = terminology;

  let verdict: RiskVerdict = 'SAFE';
  let explanation = '';

  const hadRecentColdPrecip = conditions.lastColdPrecipitation && daysSinceColdPrecip <= 5;
  const hadWinterPrecip = ['snow', 'sleet', 'freezing-rain'].includes(conditions.precipitationType);
  const washedByRain = conditions.totalRainLast48Hours >= 0.25 && conditions.lastWarmRain && hoursSinceWarmRain < hoursSinceColdPrecip;
  const sustainedWarmth = conditions.hoursAboveFreezing >= 24 && conditions.currentTemp >= 40;
  const isCurrentlyWarm = conditions.currentTemp >= 45;
  const isAboveFreezing = conditions.currentTemp > 32;
  const recentlyWarm = conditions.recentHighTemp >= 45;
  const hasFreezingRain = conditions.precipitationType === 'freezing-rain';
  const hasSustainedFreezing = conditions.currentTemp <= 28 && conditions.recentHighTemp <= 32;
  const hasActiveSnow = conditions.precipitationType === 'snow' && daysSinceColdPrecip <= 1;
  
  const canShowAvoid = shouldShowAvoid(
    stateProfile.intensity,
    hasFreezingRain,
    hasSustainedFreezing,
    hasActiveSnow
  );

  // AVOID: Active winter conditions or very recent snow/ice without washing
  if (
    hadRecentColdPrecip &&
    hadWinterPrecip &&
    daysSinceColdPrecip <= 2 &&
    !washedByRain &&
    conditions.currentTemp <= 40
  ) {
    if (canShowAvoid) {
      verdict = 'AVOID';
      explanation = `Recent snow/ice event with cold temps. ${residueTerm.charAt(0).toUpperCase() + residueTerm.slice(1)} likely still on roads.`;
    } else {
      verdict = 'BORDERLINE';
      explanation = `Recent winter weather. Some ${residueTerm} may be present if roads were treated.`;
    }
  }
  // AVOID: Recent winter precip, no rain wash, still cold
  else if (
    hadRecentColdPrecip &&
    hadWinterPrecip &&
    daysSinceColdPrecip <= 4 &&
    !washedByRain &&
    !sustainedWarmth
  ) {
    if (canShowAvoid) {
      verdict = 'AVOID';
      explanation = `${residueTerm.charAt(0).toUpperCase() + residueTerm.slice(1)} likely persists from recent winter weather. Wait for rain or warmer temps.`;
    } else {
      verdict = 'BORDERLINE';
      explanation = `Recent winter weather in your area. ${residueTerm.charAt(0).toUpperCase() + residueTerm.slice(1)} possible if roads were treated.`;
    }
  }
  // SAFE: Significant warm rain has washed the roads
  else if (washedByRain && isAboveFreezing) {
    verdict = 'SAFE';
    explanation = `Recent rain above 40°F has washed ${residueTerm} from roads.`;
  }
  // SAFE: Extended warmth clears roads even without rain
  else if (sustainedWarmth && (!hadRecentColdPrecip || daysSinceColdPrecip >= 3)) {
    verdict = 'SAFE';
    explanation = `Sustained warm temperatures. Roads are likely clear of ${residueTerm}.`;
  }
  // SAFE: No recent cold precipitation at all
  else if (!hadRecentColdPrecip && isAboveFreezing) {
    verdict = 'SAFE';
    explanation = 'No recent winter weather events. Roads should be clear.';
  }
  // SAFE: Currently warm enough that residue has likely dispersed
  else if (isCurrentlyWarm && recentlyWarm && daysSinceColdPrecip >= 2) {
    verdict = 'SAFE';
    explanation = `Warm conditions have allowed ${residueTerm} to disperse from road surfaces.`;
  }
  // BORDERLINE: Had winter precip but conditions improving
  else if (
    hadRecentColdPrecip &&
    hadWinterPrecip &&
    (isAboveFreezing || washedByRain)
  ) {
    verdict = 'BORDERLINE';
    explanation = `Conditions improving but some ${residueTerm} may remain. Use caution.`;
  }
  // BORDERLINE: Cold but no actual winter precip (preemptive treatment possible)
  else if (conditions.recentLowTemp <= 28 && !hadRecentColdPrecip) {
    if (stateProfile.intensity === 'rare') {
      verdict = 'SAFE';
      explanation = 'Cold temps but winter road treatment is uncommon in your area.';
    } else {
      verdict = 'BORDERLINE';
      explanation = `Cold temps may have prompted preemptive ${treatmentTerm}. Exercise caution.`;
    }
  }
  // Default SAFE for ambiguous warm conditions
  else if (isCurrentlyWarm) {
    verdict = 'SAFE';
    explanation = `Current conditions suggest roads are likely clear of ${residueTerm}.`;
  }
  // Default BORDERLINE for ambiguous cold conditions  
  else {
    if (stateProfile.intensity === 'rare') {
      verdict = 'SAFE';
      explanation = 'Winter road treatment is uncommon in your area. Roads likely clear.';
    } else {
      verdict = 'BORDERLINE';
      explanation = 'Mixed conditions. Check roads visually before extended driving.';
    }
  }

  const daysSinceRounded = Math.round(daysSinceColdPrecip);
  const lastColdPrecipEvent = conditions.lastColdPrecipitation
    ? `${daysSinceRounded} day${daysSinceRounded !== 1 ? 's' : ''} ago (${conditions.precipitationType})`
    : 'None in the last 7 days';

  const hoursSinceLastRain = getHoursSince(conditions.lastRain);
  const hoursSinceWarmRainRounded = Math.round(hoursSinceWarmRain);
  const hoursSinceLastRainRounded = Math.round(hoursSinceLastRain);
  
  // Check if currently raining - use a small threshold to account for timing
  const isCurrentlyRaining = conditions.lastRain && hoursSinceLastRain < 0.5;
  
  let timeSinceRain: string;
  if (isCurrentlyRaining) {
    timeSinceRain = 'Currently raining';
  } else if (conditions.lastRain && hoursSinceLastRain < 2) {
    // Rained very recently
    const minutes = Math.round(hoursSinceLastRain * 60);
    timeSinceRain = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (conditions.lastWarmRain && hoursSinceWarmRain < hoursSinceLastRain) {
    // Show warm rain if it's more recent than cold rain
    timeSinceRain = `${hoursSinceWarmRainRounded} hour${hoursSinceWarmRainRounded !== 1 ? 's' : ''} ago (${conditions.totalRainLast48Hours.toFixed(2)}" total)`;
  } else if (conditions.lastRain) {
    timeSinceRain = `${hoursSinceLastRainRounded} hour${hoursSinceLastRainRounded !== 1 ? 's' : ''} ago`;
  } else if (conditions.lastWarmRain) {
    timeSinceRain = `${hoursSinceWarmRainRounded} hour${hoursSinceWarmRainRounded !== 1 ? 's' : ''} ago (${conditions.totalRainLast48Hours.toFixed(2)}" total)`;
  } else {
    timeSinceRain = 'None recently';
  }

  const temperatureTrend =
    conditions.currentTemp > conditions.recentLowTemp + 10
      ? `Warming (${conditions.recentLowTemp}°F → ${conditions.currentTemp}°F)`
      : conditions.currentTemp < conditions.recentLowTemp - 5
      ? `Cooling (${conditions.recentLowTemp}°F → ${conditions.currentTemp}°F)`
      : `Stable around ${conditions.currentTemp}°F`;

  // Apply road treatment data override (HIGH WEIGHT)
  if (roadTreatment?.dataAvailable && roadTreatment.confidence !== 'LOW') {
    const treatmentResult = applyTreatmentOverride(
      verdict,
      explanation,
      roadTreatment,
      terminology
    );
    verdict = treatmentResult.verdict;
    explanation = treatmentResult.explanation;
  }

  const roadTreatmentDetail = formatTreatmentDetail(roadTreatment);

  return {
    verdict,
    explanation,
    details: {
      lastColdPrecipEvent,
      timeSinceRain,
      temperatureTrend,
      roadTreatment: roadTreatmentDetail,
    },
    roadTreatmentData: roadTreatment || null,
    stateCode: stateCode || null,
    treatmentIntensity: stateProfile.intensity,
  };
}

function applyTreatmentOverride(
  currentVerdict: RiskVerdict,
  currentExplanation: string,
  treatment: RoadTreatmentData,
  terminology: { residueTerm: string; treatmentTerm: string; shortTerm: string }
): { verdict: RiskVerdict; explanation: string } {
  const { residueTerm, treatmentTerm } = terminology;
  
  // ACTIVE_TREATMENT or RECENT_TREATMENT = definite AVOID
  // This is the strongest signal we have
  if (
    treatment.status === 'ACTIVE_TREATMENT' ||
    treatment.status === 'RECENT_TREATMENT'
  ) {
    return {
      verdict: 'AVOID',
      explanation: `${treatment.source} reports active/recent ${treatmentTerm}. ${residueTerm.charAt(0).toUpperCase() + residueTerm.slice(1)} expected.`,
    };
  }

  // SCHEDULED treatment = at least BORDERLINE, upgrade if currently SAFE
  if (treatment.status === 'SCHEDULED') {
    if (currentVerdict === 'SAFE') {
      return {
        verdict: 'BORDERLINE',
        explanation: `${treatment.source} shows treatment scheduled. ${treatmentTerm.charAt(0).toUpperCase() + treatmentTerm.slice(1)} may occur soon.`,
      };
    }
    return { verdict: currentVerdict, explanation: currentExplanation };
  }

  // NO_TREATMENT with high confidence can downgrade AVOID to BORDERLINE
  // or BORDERLINE to SAFE (weather permitting)
  if (treatment.status === 'NO_TREATMENT' && treatment.confidence === 'HIGH') {
    if (currentVerdict === 'AVOID') {
      return {
        verdict: 'BORDERLINE',
        explanation: `${treatment.source} shows no active treatment, but weather conditions suggest caution.`,
      };
    }
    if (currentVerdict === 'BORDERLINE') {
      return {
        verdict: 'SAFE',
        explanation: `${treatment.source} confirms no treatment. Roads likely clear.`,
      };
    }
  }

  return { verdict: currentVerdict, explanation: currentExplanation };
}

function formatTreatmentDetail(treatment?: RoadTreatmentData | null): string | null {
  if (!treatment) return null;
  
  if (!treatment.dataAvailable) {
    return treatment.details || 'Real-time data unavailable for your area';
  }

  const statusLabels: Record<TreatmentStatus, string> = {
    'ACTIVE_TREATMENT': '🚨 Active treatment/plow operations',
    'SCHEDULED': '📅 Treatment scheduled',
    'RECENT_TREATMENT': '⚠️ Recent treatment (last 24h)',
    'NO_TREATMENT': '✓ No treatment reported',
    'UNAVAILABLE': 'Data unavailable',
  };

  const label = statusLabels[treatment.status];
  const source = treatment.source ? ` (${treatment.source})` : '';
  
  return `${label}${source}`;
}

export function getMockWeatherConditions(): WeatherCondition {
  const scenarios: WeatherCondition[] = [
    {
      lastColdPrecipitation: new Date(Date.now() - 36 * 60 * 60 * 1000),
      lastWarmRain: null,
      lastRain: new Date(Date.now() - 36 * 60 * 60 * 1000),
      currentTemp: 28,
      recentLowTemp: 25,
      recentHighTemp: 32,
      precipitationType: 'snow',
      totalRainLast48Hours: 0,
      hoursAboveFreezing: 0,
    },
    {
      lastColdPrecipitation: new Date(Date.now() - 30 * 60 * 60 * 1000),
      lastWarmRain: null,
      lastRain: new Date(Date.now() - 30 * 60 * 60 * 1000),
      currentTemp: 35,
      recentLowTemp: 30,
      recentHighTemp: 38,
      precipitationType: 'sleet',
      totalRainLast48Hours: 0,
      hoursAboveFreezing: 6,
    },
    {
      lastColdPrecipitation: null,
      lastWarmRain: new Date(Date.now() - 12 * 60 * 60 * 1000),
      lastRain: new Date(Date.now() - 12 * 60 * 60 * 1000),
      currentTemp: 52,
      recentLowTemp: 45,
      recentHighTemp: 55,
      precipitationType: 'none',
      totalRainLast48Hours: 0.5,
      hoursAboveFreezing: 72,
    },
  ];

  return scenarios[Math.floor(Math.random() * scenarios.length)];
}
