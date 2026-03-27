export type TreatmentStatus = 
  | 'ACTIVE_TREATMENT'      // Salt/plow operations currently happening
  | 'SCHEDULED'             // Treatment scheduled in next 24 hours
  | 'RECENT_TREATMENT'      // Treatment occurred in last 24 hours
  | 'NO_TREATMENT'          // No treatment reported
  | 'UNAVAILABLE';          // Data not available for this location

export interface RoadTreatmentData {
  status: TreatmentStatus;
  source: string | null;
  lastUpdated: Date | null;
  details: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  dataAvailable: boolean;
  stateCode: string | null;
}
