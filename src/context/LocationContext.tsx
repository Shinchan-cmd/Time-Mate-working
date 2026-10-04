import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserLocation } from '../types';

export type PermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

interface LocationContextType {
  location: UserLocation | null;
  permissionState: PermissionState;
  errorMessage: string | null;
  loading: boolean;
  requestCurrentLocation: () => Promise<void>;
  setManualLocation: (city: string, latitude: number, longitude: number) => void;
  clearLocation: () => void;
  calculateDistanceKm: (lat: number, lng: number) => number | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Major cities reference for manual selection without any fake automatic default
export const POPULAR_LOCATIONS: { city: string; state: string; lat: number; lng: number }[] = [
  { city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { city: 'Delhi NCR', state: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { city: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
  { city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { city: 'Chandigarh', state: 'Punjab/Haryana', lat: 30.7333, lng: 76.7794 },
  { city: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673 },
];

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<UserLocation | null>(() => {
    // Restore manual location if previously explicitly chosen by user
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timemate_user_location');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Check browser permission status if supported
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        if (result.state === 'granted') {
          setPermissionState('granted');
        } else if (result.state === 'denied') {
          setPermissionState('denied');
          if (!location) {
            setErrorMessage('Location access is unavailable. Select your location manually.');
          }
        } else {
          setPermissionState('prompt');
        }

        result.onchange = () => {
          if (result.state === 'granted') {
            setPermissionState('granted');
            setErrorMessage(null);
          } else if (result.state === 'denied') {
            setPermissionState('denied');
            if (!location) {
              setErrorMessage('Location access is unavailable. Select your location manually.');
            }
          } else {
            setPermissionState('prompt');
          }
        };
      }).catch(() => {
        // Permissions query not supported
      });
    }
  }, [location]);

  const requestCurrentLocation = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPermissionState('unavailable');
      setErrorMessage('Geolocation is not supported by your browser. Please select location manually.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        let detectedCity = 'Current GPS Location';

        // Attempt reverse geocoding via OpenStreetMap Nominatim for human-readable city
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'User-Agent': 'TimeMate-LocationService/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            detectedCity = addr.city || addr.town || addr.suburb || addr.state_district || 'Current Location';
          }
        } catch {
          detectedCity = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
        }

        const newLoc: UserLocation = {
          city: detectedCity,
          latitude,
          longitude,
          source: 'gps',
          accuracy,
        };

        setLocation(newLoc);
        setPermissionState('granted');
        setLoading(false);
        setErrorMessage(null);

        if (typeof window !== 'undefined') {
          localStorage.setItem('timemate_user_location', JSON.stringify(newLoc));
        }
      },
      (error) => {
        setLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState('denied');
          setErrorMessage('Location access is unavailable. Select your location manually.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setPermissionState('unavailable');
          setErrorMessage('Location signal unavailable. Please select your location manually.');
        } else {
          setErrorMessage('Location request timed out. Select your location manually.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  const setManualLocation = useCallback((city: string, latitude: number, longitude: number) => {
    const manualLoc: UserLocation = {
      city,
      latitude,
      longitude,
      source: 'manual',
    };
    setLocation(manualLoc);
    setErrorMessage(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('timemate_user_location', JSON.stringify(manualLoc));
    }
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('timemate_user_location');
    }
  }, []);

  // Haversine formula calculation for real distance
  const calculateDistanceKm = useCallback((lat: number, lng: number): number | null => {
    if (!location || !lat || !lng) return null;
    const R = 6371; // Earth radius in km
    const dLat = ((lat - location.latitude) * Math.PI) / 180;
    const dLng = ((lng - location.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((location.latitude * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }, [location]);

  return (
    <LocationContext.Provider
      value={{
        location,
        permissionState,
        errorMessage,
        loading,
        requestCurrentLocation,
        setManualLocation,
        clearLocation,
        calculateDistanceKm,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
