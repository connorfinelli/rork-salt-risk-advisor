import { Platform } from 'react-native';
import * as Location from 'expo-location';

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

interface LocationInfo {
  state: string | null;
  city: string | null;
  county: string | null;
}

const STATE_DATA_SOURCES: Record<string, {
  name: string;
  hasApi: boolean;
  apiType?: 'ohgo' | 'mdsha' | 'arcgis' | 'fallback';
  arcgisConfig?: {
    baseUrl: string;
    layerId: number;
    roadConditionField?: string;
    treatmentFields?: string[];
  };
  fallbackUrl: string;
  fallbackMessage: string;
}> = {
  'AL': {
    name: 'ALDOT',
    hasApi: false,
    fallbackUrl: 'https://algotraffic.com',
    fallbackMessage: 'Check algotraffic.com for road conditions',
  },
  'AK': {
    name: 'Alaska DOT',
    hasApi: false,
    fallbackUrl: 'https://511.alaska.gov',
    fallbackMessage: 'Check 511.alaska.gov for road conditions',
  },
  'AR': {
    name: 'ArDOT',
    hasApi: false,
    fallbackUrl: 'https://www.idrivearkansas.com',
    fallbackMessage: 'Check idrivearkansas.com for road conditions',
  },
  'CA': {
    name: 'Caltrans',
    hasApi: false,
    fallbackUrl: 'https://quickmap.dot.ca.gov',
    fallbackMessage: 'Check quickmap.dot.ca.gov for road conditions',
  },
  'FL': {
    name: 'FDOT',
    hasApi: false,
    fallbackUrl: 'https://fl511.com',
    fallbackMessage: 'Check fl511.com for road conditions',
  },
  'HI': {
    name: 'Hawaii DOT',
    hasApi: false,
    fallbackUrl: 'https://hidot.hawaii.gov',
    fallbackMessage: 'Check hidot.hawaii.gov for road conditions',
  },
  'LA': {
    name: 'LADOTD',
    hasApi: false,
    fallbackUrl: 'https://www.511la.org',
    fallbackMessage: 'Check 511la.org for road conditions',
  },
  'MS': {
    name: 'MDOT',
    hasApi: false,
    fallbackUrl: 'https://mdottraffic.com',
    fallbackMessage: 'Check mdottraffic.com for road conditions',
  },
  'MO': {
    name: 'MoDOT',
    hasApi: false,
    fallbackUrl: 'https://www.modot.org/road-conditions',
    fallbackMessage: 'Check modot.org for road conditions',
  },
  'OK': {
    name: 'ODOT',
    hasApi: false,
    fallbackUrl: 'https://www.ok.gov/odot/Travel_Information',
    fallbackMessage: 'Check ok.gov/odot for road conditions',
  },
  'TX': {
    name: 'TxDOT',
    hasApi: false,
    fallbackUrl: 'https://drivetexas.org',
    fallbackMessage: 'Check drivetexas.org for road conditions',
  },
  'MA': {
    name: 'MassDOT',
    hasApi: false,
    fallbackUrl: 'https://www.mass511.com',
    fallbackMessage: 'Check mass511.com for winter road updates',
  },
  'RI': {
    name: 'RIDOT',
    hasApi: false,
    fallbackUrl: 'https://www.dot.ri.gov/travel/winter/',
    fallbackMessage: 'Check ridot.ri.gov for winter operations updates',
  },
  'CT': {
    name: 'CTDOT',
    hasApi: false,
    fallbackUrl: 'https://portal.ct.gov/DOT/Traveler/Highway-Cameras-and-Road-Conditions',
    fallbackMessage: 'Check ct.gov/dot for winter road conditions',
  },
  'NY': {
    name: 'NYSDOT',
    hasApi: false,
    fallbackUrl: 'https://511ny.org',
    fallbackMessage: 'Check 511ny.org for winter road updates',
  },
  'NJ': {
    name: 'NJDOT',
    hasApi: false,
    fallbackUrl: 'https://511nj.org',
    fallbackMessage: 'Check 511nj.org for winter road updates',
  },
  'PA': {
    name: 'PennDOT',
    hasApi: false,
    fallbackUrl: 'https://www.511pa.com',
    fallbackMessage: 'Check 511pa.com for winter road updates',
  },
  'OH': {
    name: 'ODOT (OHGO)',
    hasApi: false,
    fallbackUrl: 'https://www.ohgo.com',
    fallbackMessage: 'Check ohgo.com for winter driving conditions',
  },
  'MI': {
    name: 'MDOT',
    hasApi: false,
    fallbackUrl: 'https://mdotjboss.state.mi.us/MiDrive',
    fallbackMessage: 'Check Mi Drive for winter road conditions',
  },
  'MN': {
    name: 'MnDOT',
    hasApi: false,
    fallbackUrl: 'https://511mn.org',
    fallbackMessage: 'Check 511mn.org for winter road updates',
  },
  'WI': {
    name: 'WisDOT',
    hasApi: false,
    fallbackUrl: 'https://511wi.gov',
    fallbackMessage: 'Check 511wi.gov for winter road updates',
  },
  'IL': {
    name: 'IDOT',
    hasApi: false,
    fallbackUrl: 'https://www.gettingaroundillinois.com',
    fallbackMessage: 'Check gettingaroundillinois.com for road updates',
  },
  'CO': {
    name: 'CDOT (COtrip)',
    hasApi: false,
    fallbackUrl: 'https://www.cotrip.org',
    fallbackMessage: 'Check cotrip.org for winter road conditions',
  },
  'UT': {
    name: 'UDOT',
    hasApi: false,
    fallbackUrl: 'https://www.udottraffic.utah.gov',
    fallbackMessage: 'Check udottraffic.utah.gov for road conditions',
  },
  'VA': {
    name: 'VDOT',
    hasApi: false,
    fallbackUrl: 'https://www.511virginia.org',
    fallbackMessage: 'Check 511virginia.org for winter road updates',
  },
  'MD': {
    name: 'MDSHA',
    hasApi: false,
    fallbackUrl: 'https://chart.maryland.gov',
    fallbackMessage: 'Check chart.maryland.gov for road conditions',
  },
  'NH': {
    name: 'NHDOT',
    hasApi: false,
    fallbackUrl: 'https://www.nh.gov/dot',
    fallbackMessage: 'Check nh.gov/dot for winter road updates',
  },
  'VT': {
    name: 'VTrans',
    hasApi: false,
    fallbackUrl: 'https://www.511vt.com',
    fallbackMessage: 'Check 511vt.com for winter road conditions',
  },
  'ME': {
    name: 'MaineDOT',
    hasApi: false,
    fallbackUrl: 'https://newengland511.org',
    fallbackMessage: 'Check newengland511.org for road conditions',
  },
  'IN': {
    name: 'INDOT',
    hasApi: false,
    fallbackUrl: 'https://indot.carsprogram.org',
    fallbackMessage: 'Check INDOT TrafficWise for road conditions',
  },
  'IA': {
    name: 'Iowa DOT',
    hasApi: true,
    apiType: 'arcgis',
    arcgisConfig: {
      baseUrl: 'https://services.arcgis.com/8lRhdTsQyJpO52F1/ArcGIS/rest/services/511_IA_Road_Conditions_View/FeatureServer/0',
      layerId: 0,
      roadConditionField: 'HL_PAVEMENT_CONDITION',
      treatmentFields: ['HL_PAVEMENT_CONDITION', 'ROAD_CONDITION'],
    },
    fallbackUrl: 'https://www.511ia.org',
    fallbackMessage: 'Check 511ia.org for winter road updates',
  },
  'KS': {
    name: 'KDOT',
    hasApi: false,
    fallbackUrl: 'https://www.kandrive.org',
    fallbackMessage: 'Check kandrive.org for road conditions',
  },
  'NE': {
    name: 'NDOT',
    hasApi: false,
    fallbackUrl: 'https://www.511.nebraska.gov',
    fallbackMessage: 'Check 511.nebraska.gov for road conditions',
  },
  'SD': {
    name: 'SDDOT',
    hasApi: false,
    fallbackUrl: 'https://www.safetravelusa.com/sd',
    fallbackMessage: 'Check safetravelusa.com/sd for road conditions',
  },
  'ND': {
    name: 'NDDOT',
    hasApi: false,
    fallbackUrl: 'https://travel.dot.nd.gov',
    fallbackMessage: 'Check travel.dot.nd.gov for road conditions',
  },
  'MT': {
    name: 'MDT',
    hasApi: false,
    fallbackUrl: 'https://www.511mt.net',
    fallbackMessage: 'Check 511mt.net for winter road conditions',
  },
  'WY': {
    name: 'WYDOT',
    hasApi: false,
    fallbackUrl: 'https://www.wyoroad.info',
    fallbackMessage: 'Check wyoroad.info for road conditions',
  },
  'ID': {
    name: 'ITD',
    hasApi: false,
    fallbackUrl: 'https://511.idaho.gov',
    fallbackMessage: 'Check 511.idaho.gov for road conditions',
  },
  'WA': {
    name: 'WSDOT',
    hasApi: false,
    fallbackUrl: 'https://wsdot.com/travel/real-time/map',
    fallbackMessage: 'Check wsdot.com for winter road conditions',
  },
  'OR': {
    name: 'ODOT',
    hasApi: false,
    fallbackUrl: 'https://tripcheck.com',
    fallbackMessage: 'Check tripcheck.com for road conditions',
  },
  'NV': {
    name: 'NDOT',
    hasApi: false,
    fallbackUrl: 'https://www.nvroads.com',
    fallbackMessage: 'Check nvroads.com for road conditions',
  },
  'AZ': {
    name: 'ADOT',
    hasApi: false,
    fallbackUrl: 'https://az511.gov',
    fallbackMessage: 'Check az511.gov for road conditions',
  },
  'NM': {
    name: 'NMDOT',
    hasApi: false,
    fallbackUrl: 'https://nmroads.com',
    fallbackMessage: 'Check nmroads.com for road conditions',
  },
  'WV': {
    name: 'WVDOT',
    hasApi: false,
    fallbackUrl: 'https://wv511.org',
    fallbackMessage: 'Check wv511.org for winter road updates',
  },
  'KY': {
    name: 'KYTC',
    hasApi: false,
    fallbackUrl: 'https://goky.ky.gov',
    fallbackMessage: 'Check goky.ky.gov for road conditions',
  },
  'TN': {
    name: 'TDOT',
    hasApi: false,
    fallbackUrl: 'https://smartway.tn.gov',
    fallbackMessage: 'Check smartway.tn.gov for road conditions',
  },
  'NC': {
    name: 'NCDOT',
    hasApi: false,
    fallbackUrl: 'https://drivenc.gov',
    fallbackMessage: 'Check drivenc.gov for road conditions',
  },
  'SC': {
    name: 'SCDOT',
    hasApi: false,
    fallbackUrl: 'https://www.511sc.org',
    fallbackMessage: 'Check 511sc.org for road conditions',
  },
  'GA': {
    name: 'GDOT',
    hasApi: false,
    fallbackUrl: 'https://511ga.org',
    fallbackMessage: 'Check 511ga.org for road conditions',
  },
  'DC': {
    name: 'DDOT',
    hasApi: false,
    fallbackUrl: 'https://ddot.dc.gov',
    fallbackMessage: 'Check ddot.dc.gov for road conditions',
  },
  'DE': {
    name: 'DelDOT',
    hasApi: false,
    fallbackUrl: 'https://deldot.gov/map',
    fallbackMessage: 'Check deldot.gov for road conditions',
  },
};

async function getLocationInfo(
  latitude: number,
  longitude: number
): Promise<LocationInfo> {
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
      );
      const data = await response.json();
      console.log('Nominatim reverse geocode result:', JSON.stringify(data.address, null, 2));
      
      const stateCode = getStateCode(data.address?.state || '') || 
                        extractStateFromAddress(data.address);
      
      return {
        state: stateCode,
        city: data.address?.city || data.address?.town || data.address?.village || null,
        county: data.address?.county || null,
      };
    }

    const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
    console.log('Expo reverse geocode result:', JSON.stringify(addresses, null, 2));
    
    if (addresses.length > 0) {
      const addr = addresses[0];
      let stateCode = addr.region ? getStateCode(addr.region) : null;
      
      if (!stateCode && addr.isoCountryCode === 'US') {
        stateCode = inferStateFromCoordinates(latitude, longitude);
      }
      
      console.log('Extracted state code:', stateCode, 'from region:', addr.region);
      
      return {
        state: stateCode,
        city: addr.city || addr.name || null,
        county: addr.subregion || null,
      };
    }
    
    const inferredState = inferStateFromCoordinates(latitude, longitude);
    console.log('No geocode result, inferred state:', inferredState);
    return { state: inferredState, city: null, county: null };
  } catch (error) {
    console.error('Error getting location info:', error);
    const inferredState = inferStateFromCoordinates(latitude, longitude);
    return { state: inferredState, city: null, county: null };
  }
}

const STATE_CODES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];

const STATE_NAME_MAP: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
};

const STATE_BOUNDING_BOXES: Record<string, { minLat: number; maxLat: number; minLon: number; maxLon: number }> = {
  'OH': { minLat: 38.4, maxLat: 42.0, minLon: -84.9, maxLon: -80.5 },
  'NY': { minLat: 40.5, maxLat: 45.0, minLon: -79.8, maxLon: -71.9 },
  'PA': { minLat: 39.7, maxLat: 42.3, minLon: -80.5, maxLon: -74.7 },
  'MI': { minLat: 41.7, maxLat: 48.3, minLon: -90.4, maxLon: -82.1 },
  'IN': { minLat: 37.8, maxLat: 41.8, minLon: -88.1, maxLon: -84.8 },
  'IL': { minLat: 36.97, maxLat: 42.5, minLon: -91.5, maxLon: -87.0 },
  'WI': { minLat: 42.5, maxLat: 47.1, minLon: -92.9, maxLon: -86.8 },
  'MN': { minLat: 43.5, maxLat: 49.4, minLon: -97.2, maxLon: -89.5 },
  'IA': { minLat: 40.4, maxLat: 43.5, minLon: -96.6, maxLon: -90.1 },
  'MO': { minLat: 36.0, maxLat: 40.6, minLon: -95.8, maxLon: -89.1 },
  'MA': { minLat: 41.2, maxLat: 42.9, minLon: -73.5, maxLon: -69.9 },
  'CT': { minLat: 40.98, maxLat: 42.05, minLon: -73.73, maxLon: -71.79 },
  'RI': { minLat: 41.1, maxLat: 42.02, minLon: -71.9, maxLon: -71.1 },
  'NJ': { minLat: 38.9, maxLat: 41.4, minLon: -75.6, maxLon: -73.9 },
  'MD': { minLat: 37.9, maxLat: 39.7, minLon: -79.5, maxLon: -75.0 },
  'VA': { minLat: 36.5, maxLat: 39.5, minLon: -83.7, maxLon: -75.2 },
  'WV': { minLat: 37.2, maxLat: 40.6, minLon: -82.6, maxLon: -77.7 },
  'KY': { minLat: 36.5, maxLat: 39.1, minLon: -89.6, maxLon: -81.96 },
  'TN': { minLat: 35.0, maxLat: 36.7, minLon: -90.3, maxLon: -81.6 },
  'NC': { minLat: 33.8, maxLat: 36.6, minLon: -84.3, maxLon: -75.5 },
  'NH': { minLat: 42.7, maxLat: 45.3, minLon: -72.6, maxLon: -70.6 },
  'VT': { minLat: 42.7, maxLat: 45.0, minLon: -73.4, maxLon: -71.5 },
  'ME': { minLat: 43.0, maxLat: 47.5, minLon: -71.1, maxLon: -66.9 },
  'CO': { minLat: 37.0, maxLat: 41.0, minLon: -109.1, maxLon: -102.0 },
  'UT': { minLat: 37.0, maxLat: 42.0, minLon: -114.1, maxLon: -109.0 },
  'NV': { minLat: 35.0, maxLat: 42.0, minLon: -120.0, maxLon: -114.0 },
  'AZ': { minLat: 31.3, maxLat: 37.0, minLon: -114.8, maxLon: -109.0 },
  'NM': { minLat: 31.3, maxLat: 37.0, minLon: -109.1, maxLon: -103.0 },
  'ID': { minLat: 42.0, maxLat: 49.0, minLon: -117.2, maxLon: -111.0 },
  'MT': { minLat: 44.4, maxLat: 49.0, minLon: -116.1, maxLon: -104.0 },
  'WY': { minLat: 41.0, maxLat: 45.0, minLon: -111.1, maxLon: -104.1 },
  'WA': { minLat: 45.5, maxLat: 49.0, minLon: -124.8, maxLon: -116.9 },
  'OR': { minLat: 42.0, maxLat: 46.3, minLon: -124.6, maxLon: -116.5 },
  'ND': { minLat: 45.9, maxLat: 49.0, minLon: -104.1, maxLon: -96.6 },
  'SD': { minLat: 42.5, maxLat: 45.9, minLon: -104.1, maxLon: -96.4 },
  'NE': { minLat: 40.0, maxLat: 43.0, minLon: -104.1, maxLon: -95.3 },
  'KS': { minLat: 37.0, maxLat: 40.0, minLon: -102.1, maxLon: -94.6 },
  'DE': { minLat: 38.45, maxLat: 39.84, minLon: -75.79, maxLon: -75.05 },
  'DC': { minLat: 38.8, maxLat: 39.0, minLon: -77.1, maxLon: -76.9 },
  'SC': { minLat: 32.0, maxLat: 35.2, minLon: -83.4, maxLon: -78.5 },
  'GA': { minLat: 30.4, maxLat: 35.0, minLon: -85.6, maxLon: -80.8 },
};

function inferStateFromCoordinates(latitude: number, longitude: number): string | null {
  for (const [stateCode, box] of Object.entries(STATE_BOUNDING_BOXES)) {
    if (
      latitude >= box.minLat &&
      latitude <= box.maxLat &&
      longitude >= box.minLon &&
      longitude <= box.maxLon
    ) {
      console.log(`Inferred state ${stateCode} from coordinates (${latitude}, ${longitude})`);
      return stateCode;
    }
  }
  return null;
}

function extractStateFromAddress(address: Record<string, string> | undefined): string | null {
  if (!address) return null;
  
  for (const value of Object.values(address)) {
    if (typeof value === 'string') {
      const upper = value.toUpperCase();
      if (STATE_CODES.includes(upper)) {
        return upper;
      }
      const normalized = value.toLowerCase().trim();
      if (STATE_NAME_MAP[normalized]) {
        return STATE_NAME_MAP[normalized];
      }
    }
  }
  return null;
}

function getStateCode(stateName: string): string | null {
  if (!stateName) return null;
  
  const trimmed = stateName.trim();
  if (trimmed.length === 2) {
    const upper = trimmed.toUpperCase();
    if (STATE_CODES.includes(upper)) {
      return upper;
    }
  }

  const normalized = trimmed.toLowerCase();
  return STATE_NAME_MAP[normalized] || null;
}

async function fetchOHGOData(latitude: number, longitude: number): Promise<RoadTreatmentData> {
  try {
    const response = await fetch(
      'https://publicapi.ohgo.com/api/v1/winterdriving',
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      throw new Error(`OHGO API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OHGO data received');

    const nearbyTreatments = data.results?.filter((item: any) => {
      if (!item.latitude || !item.longitude) return false;
      const dist = getDistance(latitude, longitude, item.latitude, item.longitude);
      return dist < 50;
    });

    if (nearbyTreatments?.length > 0) {
      const hasActiveTreatment = nearbyTreatments.some(
        (t: any) => t.status?.toLowerCase().includes('treating') || 
                    t.status?.toLowerCase().includes('plowing')
      );

      if (hasActiveTreatment) {
        return {
          status: 'ACTIVE_TREATMENT',
          source: 'ODOT (OHGO)',
          lastUpdated: new Date(),
          details: 'Active road treatment in your area',
          confidence: 'HIGH',
          dataAvailable: true,
          stateCode: 'OH',
        };
      }
    }

    return {
      status: 'NO_TREATMENT',
      source: 'ODOT (OHGO)',
      lastUpdated: new Date(),
      details: 'No active treatment reported nearby',
      confidence: 'MEDIUM',
      dataAvailable: true,
      stateCode: 'OH',
    };
  } catch (error) {
    console.error('Error fetching OHGO data:', error);
    return {
      status: 'UNAVAILABLE',
      source: 'ODOT (OHGO)',
      lastUpdated: null,
      details: 'Unable to fetch real-time data',
      confidence: 'LOW',
      dataAvailable: false,
      stateCode: 'OH',
    };
  }
}

function getFallbackResponse(state: string): RoadTreatmentData {
  const source = STATE_DATA_SOURCES[state];
  return {
    status: 'UNAVAILABLE',
    source: source?.name || null,
    lastUpdated: null,
    details: source?.fallbackMessage || `Check your state DOT website for road conditions`,
    confidence: 'LOW',
    dataAvailable: false,
    stateCode: state,
  };
}

async function fetchArcGISData(
  latitude: number,
  longitude: number,
  config: {
    baseUrl: string;
    layerId: number;
    roadConditionField?: string;
    treatmentFields?: string[];
  },
  sourceName: string
): Promise<RoadTreatmentData> {
  try {
    const bufferDegrees = 0.15;
    const envelope = {
      xmin: longitude - bufferDegrees,
      ymin: latitude - bufferDegrees,
      xmax: longitude + bufferDegrees,
      ymax: latitude + bufferDegrees,
    };

    const queryUrl = `${config.baseUrl}/query?` + new URLSearchParams({
      geometry: JSON.stringify(envelope),
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      returnGeometry: 'false',
      f: 'json',
    }).toString();

    console.log(`Fetching ArcGIS data from: ${config.baseUrl}`);
    
    const response = await fetch(queryUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`ArcGIS API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`ArcGIS ${sourceName} response:`, JSON.stringify(data).slice(0, 500));

    if (data.error) {
      throw new Error(`ArcGIS error: ${data.error.message || data.error.code}`);
    }

    const features = data.features || [];
    
    if (features.length === 0) {
      return {
        status: 'NO_TREATMENT',
        source: sourceName,
        lastUpdated: new Date(),
        details: 'No road condition data in your immediate area',
        confidence: 'MEDIUM',
        dataAvailable: true,
        stateCode: null,
      };
    }

    const treatmentStatus = analyzeArcGISFeatures(features, config);
    
    return {
      status: treatmentStatus.status,
      source: sourceName,
      lastUpdated: new Date(),
      details: treatmentStatus.details,
      confidence: treatmentStatus.confidence,
      dataAvailable: true,
      stateCode: null,
    };
  } catch (error) {
    console.error(`Error fetching ${sourceName} ArcGIS data:`, error);
    return {
      status: 'UNAVAILABLE',
      source: sourceName,
      lastUpdated: null,
      details: 'Unable to fetch real-time data',
      confidence: 'LOW',
      dataAvailable: false,
      stateCode: null,
    };
  }
}

function analyzeArcGISFeatures(
  features: any[],
  config: { roadConditionField?: string; treatmentFields?: string[] }
): { status: TreatmentStatus; details: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } {
  const treatmentKeywords = [
    'treat', 'salt', 'plow', 'sand', 'brine', 'chemical', 'clearing',
    'snow removal', 'ice control', 'deicing', 'anti-icing',
  ];
  
  const hazardKeywords = [
    'ice', 'icy', 'snow', 'slush', 'frost', 'freezing', 'slick', 'hazard',
    'wet', 'covered', 'pack', 'drift', 'black ice',
  ];
  
  const clearKeywords = [
    'clear', 'dry', 'normal', 'good', 'bare', 'open', 'no restriction',
  ];

  let hasActiveTreatment = false;
  let hasHazardousConditions = false;
  let hasClearConditions = false;
  let conditionDetails: string[] = [];

  for (const feature of features) {
    const attrs = feature.attributes || {};
    
    const fieldsToCheck = config.treatmentFields || [config.roadConditionField || 'CONDITION'];
    
    for (const field of fieldsToCheck) {
      const value = attrs[field];
      if (!value || typeof value !== 'string') continue;
      
      const lowerValue = value.toLowerCase();
      
      if (treatmentKeywords.some(k => lowerValue.includes(k))) {
        hasActiveTreatment = true;
        conditionDetails.push(value);
      }
      
      if (hazardKeywords.some(k => lowerValue.includes(k))) {
        hasHazardousConditions = true;
        conditionDetails.push(value);
      }
      
      if (clearKeywords.some(k => lowerValue.includes(k))) {
        hasClearConditions = true;
      }
    }
    
    for (const [key, value] of Object.entries(attrs)) {
      if (typeof value !== 'string') continue;
      const lowerValue = value.toLowerCase();
      const lowerKey = key.toLowerCase();
      
      if (lowerKey.includes('condition') || lowerKey.includes('status') || lowerKey.includes('surface')) {
        if (treatmentKeywords.some(k => lowerValue.includes(k))) {
          hasActiveTreatment = true;
        }
        if (hazardKeywords.some(k => lowerValue.includes(k))) {
          hasHazardousConditions = true;
        }
      }
    }
  }

  const uniqueDetails = [...new Set(conditionDetails)].slice(0, 3);

  if (hasActiveTreatment) {
    return {
      status: 'ACTIVE_TREATMENT',
      details: uniqueDetails.length > 0 
        ? `Treatment in progress: ${uniqueDetails.join(', ')}` 
        : 'Road treatment operations active in your area',
      confidence: 'HIGH',
    };
  }

  if (hasHazardousConditions) {
    return {
      status: 'NO_TREATMENT',
      details: uniqueDetails.length > 0 
        ? `Current conditions: ${uniqueDetails.join(', ')}` 
        : 'Winter conditions reported, no active treatment detected',
      confidence: 'MEDIUM',
    };
  }

  if (hasClearConditions) {
    return {
      status: 'RECENT_TREATMENT',
      details: 'Roads reported as clear/dry',
      confidence: 'HIGH',
    };
  }

  return {
    status: 'NO_TREATMENT',
    details: 'No active treatment reported',
    confidence: 'MEDIUM',
  };
}

async function fetchMDSHAData(latitude: number, longitude: number): Promise<RoadTreatmentData> {
  try {
    const response = await fetch(
      'https://chart.maryland.gov/api/SOC/getSOCData',
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      throw new Error(`MDSHA API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('MDSHA data received');

    const hasWinterOps = data.some?.((item: any) => 
      item.Category?.toLowerCase().includes('winter') ||
      item.Description?.toLowerCase().includes('salt') ||
      item.Description?.toLowerCase().includes('plow')
    );

    if (hasWinterOps) {
      return {
        status: 'ACTIVE_TREATMENT',
        source: 'MDSHA',
        lastUpdated: new Date(),
        details: 'Winter operations reported in Maryland',
        confidence: 'MEDIUM',
        dataAvailable: true,
        stateCode: 'MD',
      };
    }

    return {
      status: 'NO_TREATMENT',
      source: 'MDSHA',
      lastUpdated: new Date(),
      details: 'No winter operations currently reported',
      confidence: 'MEDIUM',
      dataAvailable: true,
      stateCode: 'MD',
    };
  } catch (error) {
    console.error('Error fetching MDSHA data:', error);
    return {
      status: 'UNAVAILABLE',
      source: 'MDSHA',
      lastUpdated: null,
      details: 'Unable to fetch real-time data',
      confidence: 'LOW',
      dataAvailable: false,
      stateCode: 'MD',
    };
  }
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function fetchRoadTreatmentData(
  latitude: number,
  longitude: number
): Promise<RoadTreatmentData> {
  console.log('Fetching road treatment data for:', { latitude, longitude });

  const locationInfo = await getLocationInfo(latitude, longitude);
  console.log('Location info:', locationInfo);

  if (!locationInfo.state) {
    return {
      status: 'UNAVAILABLE',
      source: null,
      lastUpdated: null,
      details: 'Could not determine your state',
      confidence: 'LOW',
      dataAvailable: false,
      stateCode: null,
    };
  }

  const stateSource = STATE_DATA_SOURCES[locationInfo.state];
  
  if (!stateSource) {
    console.log(`No data source configured for state: ${locationInfo.state}`);
    return {
      status: 'UNAVAILABLE',
      source: null,
      lastUpdated: null,
      details: `Check your state DOT website for winter road conditions`,
      confidence: 'LOW',
      dataAvailable: false,
      stateCode: locationInfo.state,
    };
  }

  console.log(`Using data source: ${stateSource.name}`);

  if (!stateSource.hasApi) {
    return getFallbackResponse(locationInfo.state);
  }

  let result: RoadTreatmentData;
  
  switch (stateSource.apiType) {
    case 'ohgo':
      result = await fetchOHGOData(latitude, longitude);
      break;
    case 'mdsha':
      result = await fetchMDSHAData(latitude, longitude);
      break;
    case 'arcgis':
      if (stateSource.arcgisConfig) {
        result = await fetchArcGISData(latitude, longitude, stateSource.arcgisConfig, stateSource.name);
      } else {
        result = getFallbackResponse(locationInfo.state);
      }
      break;
    default:
      result = getFallbackResponse(locationInfo.state);
  }
  
  result.stateCode = locationInfo.state;
  return result;
}

export function getDataSourceInfo(state: string | null): {
  available: boolean;
  sourceName: string | null;
  url: string | null;
  message: string | null;
} {
  if (!state) {
    return { available: false, sourceName: null, url: null, message: null };
  }

  const source = STATE_DATA_SOURCES[state];
  if (!source) {
    return { 
      available: false, 
      sourceName: null, 
      url: null, 
      message: 'Check your state DOT website for road conditions',
    };
  }

  return {
    available: source.hasApi,
    sourceName: source.name,
    url: source.fallbackUrl,
    message: source.fallbackMessage,
  };
}
