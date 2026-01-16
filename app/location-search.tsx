import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, Navigation, X, ChevronLeft } from 'lucide-react-native';

export type LocationResult = {
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
};

const POPULAR_CITIES: LocationResult[] = [
  { id: 'boston', name: 'Boston', displayName: 'Boston, MA', latitude: 42.3601, longitude: -71.0589 },
  { id: 'providence', name: 'Providence', displayName: 'Providence, RI', latitude: 41.824, longitude: -71.4128 },
  { id: 'newyork', name: 'New York', displayName: 'New York, NY', latitude: 40.7128, longitude: -74.006 },
  { id: 'chicago', name: 'Chicago', displayName: 'Chicago, IL', latitude: 41.8781, longitude: -87.6298 },
  { id: 'denver', name: 'Denver', displayName: 'Denver, CO', latitude: 39.7392, longitude: -104.9903 },
  { id: 'minneapolis', name: 'Minneapolis', displayName: 'Minneapolis, MN', latitude: 44.9778, longitude: -93.265 },
  { id: 'detroit', name: 'Detroit', displayName: 'Detroit, MI', latitude: 42.3314, longitude: -83.0458 },
  { id: 'philadelphia', name: 'Philadelphia', displayName: 'Philadelphia, PA', latitude: 39.9526, longitude: -75.1652 },
  { id: 'northconway', name: 'North Conway', displayName: 'North Conway, NH', latitude: 44.0537, longitude: -71.1284 },
  { id: 'columbus', name: 'Columbus', displayName: 'Columbus, OH', latitude: 39.9612, longitude: -82.9988 },
];

const STATE_ABBREVS: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC',
};

function getStateAbbrevFromName(stateName: string): string {
  const normalized = stateName.toLowerCase().trim();
  return STATE_ABBREVS[normalized] || stateName.substring(0, 2).toUpperCase();
}

async function searchWithPhoton(query: string, signal?: AbortSignal): Promise<LocationResult[]> {
  const response = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=15&lang=en&layer=city&layer=locality&bbox=-125,24,-66,50`,
    { signal }
  );
  
  if (!response.ok) throw new Error('Photon API error');
  
  const data = await response.json();
  console.log('Photon results:', data.features?.length || 0);
  
  return (data.features || [])
    .filter((f: any) => f.properties?.country === 'United States')
    .map((f: any) => {
      const props = f.properties;
      const coords = f.geometry?.coordinates || [];
      const name = props.name || props.city || props.locality || '';
      const state = props.state || '';
      const stateCode = getStateAbbrevFromName(state);
      
      return {
        id: `photon-${props.osm_id || Math.random()}`,
        name,
        displayName: stateCode ? `${name}, ${stateCode}` : name,
        latitude: coords[1],
        longitude: coords[0],
      };
    })
    .filter((r: LocationResult) => r.name && r.latitude && r.longitude);
}

async function searchWithNominatim(query: string, signal?: AbortSignal): Promise<LocationResult[]> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
    `format=json&q=${encodeURIComponent(query + ', USA')}&countrycodes=us&limit=15&addressdetails=1`,
    {
      headers: { 'User-Agent': 'SaltRiskApp/1.0' },
      signal,
    }
  );
  
  if (!response.ok) throw new Error('Nominatim API error');
  
  const data = await response.json();
  console.log('Nominatim results:', data.length);
  
  return data.map((item: any) => {
    const address = item.address || {};
    const name = address.city || address.town || address.village || 
                address.hamlet || address.municipality || item.name || '';
    const state = address.state || '';
    const stateCode = getStateAbbrevFromName(state);
    
    return {
      id: `nom-${item.place_id}`,
      name: name || item.display_name.split(',')[0].trim(),
      displayName: stateCode ? `${name}, ${stateCode}` : item.display_name.split(',').slice(0, 2).join(', '),
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    };
  }).filter((r: LocationResult) => r.name && r.latitude && r.longitude);
}

async function searchLocations(query: string, signal?: AbortSignal): Promise<LocationResult[]> {
  if (query.length < 2) return [];
  
  console.log('Searching for:', query);
  
  try {
    // Try Photon first (better fuzzy matching)
    let results = await searchWithPhoton(query, signal);
    
    // Fallback to Nominatim if Photon returns nothing
    if (results.length === 0) {
      console.log('Photon returned no results, trying Nominatim...');
      results = await searchWithNominatim(query, signal);
    }
    
    // Deduplicate by coordinates
    const seen = new Set<string>();
    const uniqueResults = results.filter((item: LocationResult) => {
      const key = `${item.latitude.toFixed(2)}-${item.longitude.toFixed(2)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log('Final results:', uniqueResults.length);
    return uniqueResults.slice(0, 10);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Search cancelled');
      return [];
    }
    console.log('Search error:', error.message);
    return [];
  }
}

export default function LocationSearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (text.length < 2) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    searchTimeoutRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();
      
      try {
        const searchResults = await searchLocations(text, abortControllerRef.current.signal);
        setResults(searchResults);
        setHasSearched(true);
      } catch {
        console.log('Search cancelled or failed');
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  const handleSelectLocation = (location: LocationResult | null) => {
    Keyboard.dismiss();
    router.navigate({
      pathname: '/',
      params: location ? {
        customLat: location.latitude.toString(),
        customLon: location.longitude.toString(),
        customName: location.displayName,
      } : {
        useCurrentLocation: 'true',
      },
    });
  };

  const handleUseCurrentLocation = () => {
    handleSelectLocation(null);
  };

  const renderLocationItem = ({ item }: { item: LocationResult }) => (
    <Pressable
      style={({ pressed }) => [
        styles.resultItem,
        pressed && styles.resultItemPressed,
      ]}
      onPress={() => handleSelectLocation(item)}
    >
      <View style={styles.resultIcon}>
        <MapPin size={20} color="#6B7280" />
      </View>
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.resultAddress} numberOfLines={1}>{item.displayName}</Text>
      </View>
    </Pressable>
  );

  const displayList = query.length >= 2 ? results : POPULAR_CITIES;
  const listTitle = query.length >= 2 ? 'Search Results' : 'Popular Cities';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#374151" />
          </Pressable>
          <Text style={styles.headerTitle}>Change Location</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Search size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search city or zip code..."
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={handleSearch}
              autoFocus
              returnKeyType="search"
              autoCapitalize="words"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => handleSearch('')}>
                <X size={20} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.currentLocationButton,
            pressed && styles.currentLocationButtonPressed,
          ]}
          onPress={handleUseCurrentLocation}
        >
          <View style={styles.currentLocationIcon}>
            <Navigation size={20} color="#2563EB" />
          </View>
          <Text style={styles.currentLocationText}>Use Current Location</Text>
        </Pressable>

        <View style={styles.divider} />

        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#6B7280" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>{listTitle}</Text>
            {hasSearched && results.length === 0 && query.length >= 2 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No locations found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            ) : (
              <FlatList
                data={displayList}
                keyExtractor={(item) => item.id}
                renderItem={renderLocationItem}
                style={styles.resultsList}
                contentContainerStyle={styles.resultsContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  backButtonPressed: {
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    gap: 12,
  },
  currentLocationButtonPressed: {
    backgroundColor: '#DBEAFE',
  },
  currentLocationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#2563EB',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  resultItemPressed: {
    backgroundColor: '#F3F4F6',
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 13,
    color: '#6B7280',
  },
});
