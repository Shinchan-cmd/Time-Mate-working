import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { UserLocation, Profile } from '../types';

interface InteractiveMapProps {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  companions?: Profile[];
  userLocation?: UserLocation | null;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  selectedCompanionId?: string;
  onSelectCompanion?: (companion: Profile) => void;
  activeTracking?: {
    companionCoords: { lat: number; lng: number };
    customerCoords: { lat: number; lng: number };
  };
  className?: string;
  height?: string;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  centerLat = 12.9716, // Default Bangalore center if no location set
  centerLng = 77.5946,
  zoom = 13,
  companions = [],
  userLocation,
  interactive = false,
  onLocationSelect,
  selectedCompanionId,
  onSelectCompanion,
  activeTracking,
  className = '',
  height = '400px',
}) => {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const effectiveLat = userLocation?.latitude || centerLat;
  const effectiveLng = userLocation?.longitude || centerLng;

  // Use Leaflet if Google Maps API key is not configured
  useEffect(() => {
    if (googleMapsApiKey) return;
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [effectiveLat, effectiveLng],
        zoom: zoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      leafletMapRef.current = map;

      if (interactive && onLocationSelect) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        });
      }
    } else {
      leafletMapRef.current.setView([effectiveLat, effectiveLng], zoom);
    }

    return () => {
      // Cleanup on unmount
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [googleMapsApiKey]);

  // Update markers on the Leaflet map
  useEffect(() => {
    if (googleMapsApiKey || !leafletMapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // 1. User Location Pin
    if (userLocation) {
      const userPin = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-75"></span>
            <div class="relative w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white text-[10px] font-bold">
              You
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([userLocation.latitude, userLocation.longitude], { icon: userPin })
        .bindPopup(`<b>Your Location</b><br/>${userLocation.city}`)
        .addTo(markersLayerRef.current);
    }

    // 2. Companions Pins
    companions.forEach((comp) => {
      if (!comp.latitude || !comp.longitude) return;

      const isSelected = comp.id === selectedCompanionId;
      const compPin = L.divIcon({
        className: 'custom-companion-marker',
        html: `
          <div class="cursor-pointer transform hover:scale-110 transition-transform">
            <div class="w-8 h-8 rounded-full border-2 ${
              isSelected ? 'border-amber-400 ring-2 ring-indigo-600' : 'border-white'
            } bg-indigo-600 shadow-md flex items-center justify-center text-white font-bold text-xs overflow-hidden">
              ${
                comp.avatar_url
                  ? `<img src="${comp.avatar_url}" class="w-full h-full object-cover"/>`
                  : comp.display_name.slice(0, 2).toUpperCase()
              }
            </div>
            <div class="bg-gray-900 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow text-center -mt-1 mx-auto max-w-[60px] truncate">
              ₹${comp.hourly_rate || 500}/hr
            </div>
          </div>
        `,
        iconSize: [32, 42],
        iconAnchor: [16, 21],
      });

      const marker = L.marker([comp.latitude, comp.longitude], { icon: compPin });
      marker.on('click', () => {
        onSelectCompanion?.(comp);
      });
      marker.bindPopup(`
        <div class="p-1 text-xs">
          <div class="font-bold text-gray-900">${comp.display_name}</div>
          <div class="text-indigo-600 font-semibold">₹${comp.hourly_rate || 500}/hr</div>
          <div class="text-gray-500 text-[10px]">${comp.city || 'Verified Companion'}</div>
        </div>
      `);
      marker.addTo(markersLayerRef.current!);
    });

    // 3. Active tracking lines / markers
    if (activeTracking) {
      const { companionCoords, customerCoords } = activeTracking;

      const polyline = L.polyline(
        [
          [companionCoords.lat, companionCoords.lng],
          [customerCoords.lat, customerCoords.lng],
        ],
        { color: '#4f46e5', weight: 4, dashArray: '6, 8' }
      ).addTo(markersLayerRef.current);

      leafletMapRef.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    }
  }, [googleMapsApiKey, companions, userLocation, selectedCompanionId, activeTracking]);

  // Render Google Maps if API key is provided
  if (googleMapsApiKey) {
    return (
      <div className={`relative w-full rounded-2xl overflow-hidden shadow-inner ${className}`} style={{ height }}>
        <APIProvider apiKey={googleMapsApiKey}>
          <Map
            defaultCenter={{ lat: effectiveLat, lng: effectiveLng }}
            defaultZoom={zoom}
            gestureHandling={'greedy'}
            disableDefaultUI={false}
            mapId={'DEMO_MAP_ID'}
            style={{ width: '100%', height: '100%' }}
            onClick={(e) => {
              if (interactive && onLocationSelect && e.detail.latLng) {
                onLocationSelect(e.detail.latLng.lat, e.detail.latLng.lng);
              }
            }}
          >
            {userLocation && (
              <AdvancedMarker position={{ lat: userLocation.latitude, lng: userLocation.longitude }}>
                <div className="w-5 h-5 bg-blue-600 border-2 border-white rounded-full shadow-lg" />
              </AdvancedMarker>
            )}

            {companions.map((comp) => {
              if (!comp.latitude || !comp.longitude) return null;
              return (
                <AdvancedMarker
                  key={comp.id}
                  position={{ lat: comp.latitude, lng: comp.longitude }}
                  onClick={() => onSelectCompanion?.(comp)}
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-white text-white flex items-center justify-center font-bold text-xs shadow-md">
                    {comp.display_name.slice(0, 2).toUpperCase()}
                  </div>
                </AdvancedMarker>
              );
            })}
          </Map>
        </APIProvider>
      </div>
    );
  }

  // Render Leaflet/OpenStreetMap
  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-gray-200 ${className}`} style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {interactive && (
        <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-lg shadow-sm border border-gray-200 text-xs font-medium text-gray-700 pointer-events-none">
          Click map to set meeting location
        </div>
      )}
    </div>
  );
};
