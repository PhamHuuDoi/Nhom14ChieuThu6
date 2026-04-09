'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';

import {
    reverseGeocodeOpenStreetMap,
    searchOpenStreetMap,
    type OpenStreetMapLocationSelection,
} from '@/lib/openstreetmap';

type LocationSearchProps = {
    label?: string;
    placeholder?: string;
    onSelect: (place: OpenStreetMapLocationSelection) => void;
};

const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009];
const AUTOCOMPLETE_DEBOUNCE_MS = 400;

export function LocationSearch({
    label = 'Tìm địa chỉ bằng OpenStreetMap',
    placeholder = 'Nhập tên đường, tòa nhà, địa chỉ...',
    onSelect,
}: LocationSearchProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const leafletRef = useRef<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [searchResults, setSearchResults] = useState<OpenStreetMapLocationSelection[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasTypedSearch, setHasTypedSearch] = useState(false);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) {
            return;
        }

        let isMounted = true;
        let map: any = null;

        const styleId = 'leaflet-stylesheet';
        if (!document.getElementById(styleId)) {
            const link = document.createElement('link');
            link.id = styleId;
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        void import('leaflet').then((leafletModule) => {
            if (!isMounted || !mapContainerRef.current) return;

            const L = leafletModule.default;
            leafletRef.current = L;
            map = L.map(mapContainerRef.current, {
                center: DEFAULT_CENTER,
                zoom: 13,
                scrollWheelZoom: false,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
            }).addTo(map);

            map.on('click', async (event: any) => {
                try {
                    setStatusMessage('Đang đọc địa chỉ từ điểm bạn vừa chọn...');
                    const selectedPlace = await reverseGeocodeOpenStreetMap(
                        event.latlng.lat,
                        event.latlng.lng
                    );

                    if (!selectedPlace) {
                        setStatusMessage('Không đọc được địa chỉ từ vị trí này.');
                        return;
                    }

                    onSelect(selectedPlace);
                    setSearchResults([]);
                    setSearchQuery(selectedPlace.formattedAddress);
                    setHasTypedSearch(false);
                    setStatusMessage('Đã chọn địa điểm từ OpenStreetMap.');

                    if (!markerRef.current) {
                        markerRef.current = L.circleMarker(event.latlng, {
                            radius: 8,
                            color: '#6d3f1f',
                            fillColor: '#a86b3b',
                            fillOpacity: 0.9,
                            weight: 2,
                        }).addTo(map);
                    } else {
                        markerRef.current.setLatLng(event.latlng);
                    }
                } catch (error) {
                    setStatusMessage(
                        error instanceof Error
                            ? error.message
                            : 'Không thể đọc địa chỉ từ vị trí đã chọn.'
                    );
                }
            });

            mapRef.current = map;
        });

        return () => {
            isMounted = false;
            if (map) {
                map.remove();
            }
            mapRef.current = null;
            markerRef.current = null;
        };
    }, [onSelect]);

    const focusLocation = (place: OpenStreetMapLocationSelection) => {
        const L = leafletRef.current;

        if (!mapRef.current || !L || place.latitude === null || place.longitude === null) {
            return;
        }

        const latLng = L.latLng(place.latitude, place.longitude);
        mapRef.current.setView(latLng, 16);

        if (!markerRef.current) {
            markerRef.current = L.circleMarker(latLng, {
                radius: 8,
                color: '#6d3f1f',
                fillColor: '#a86b3b',
                fillOpacity: 0.9,
                weight: 2,
            }).addTo(mapRef.current);
        } else {
            markerRef.current.setLatLng(latLng);
        }
    };

    useEffect(() => {
        if (!hasTypedSearch) {
            return;
        }

        const trimmedQuery = searchQuery.trim();

        if (trimmedQuery.length < 3) {
            setSearchResults([]);
            setIsSearching(false);
            setStatusMessage(
                trimmedQuery.length === 0
                    ? ''
                    : 'Nhập ít nhất 3 ký tự để hiện gợi ý địa chỉ.'
            );
            return;
        }

        let isActive = true;
        setIsSearching(true);

        const timer = window.setTimeout(() => {
            searchOpenStreetMap(trimmedQuery)
                .then((results) => {
                    if (!isActive) return;
                    setSearchResults(results);
                    setStatusMessage(
                        results.length > 0
                            ? 'Chọn một gợi ý bên dưới hoặc click trực tiếp lên bản đồ.'
                            : 'Không tìm thấy địa chỉ phù hợp.'
                    );
                })
                .catch((error) => {
                    if (!isActive) return;
                    setSearchResults([]);
                    setStatusMessage(
                        error instanceof Error
                            ? error.message
                            : 'Không thể tìm địa chỉ từ OpenStreetMap.'
                    );
                })
                .finally(() => {
                    if (isActive) {
                        setIsSearching(false);
                    }
                });
        }, AUTOCOMPLETE_DEBOUNCE_MS);

        return () => {
            isActive = false;
            window.clearTimeout(timer);
        };
    }, [hasTypedSearch, searchQuery]);

    const handlePickResult = (place: OpenStreetMapLocationSelection) => {
        onSelect(place);
        focusLocation(place);
        setSearchQuery(place.formattedAddress);
        setSearchResults([]);
        setHasTypedSearch(false);
        setStatusMessage('Đã chọn địa điểm từ OpenStreetMap.');
    };

    return (
        <div className="rounded-2xl border border-border bg-background p-4 sm:col-span-2">
            <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">{label}</span>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                            setHasTypedSearch(true);
                        }}
                        className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm"
                        placeholder={placeholder}
                    />
                    {isSearching ? (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                            Đang gợi ý...
                        </span>
                    ) : null}
                </div>
            </div>

            {searchResults.length > 0 ? (
                <div className="mt-3 grid gap-2">
                    {searchResults.map((place) => (
                        <button
                            key={`${place.placeId}-${place.latitude}-${place.longitude}`}
                            type="button"
                            onClick={() => handlePickResult(place)}
                            className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-left transition hover:border-primary"
                        >
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="text-sm leading-6 text-foreground">
                                {place.formattedAddress}
                            </span>
                        </button>
                    ))}
                </div>
            ) : null}

            <div
                ref={mapContainerRef}
                className="mt-4 h-64 overflow-hidden rounded-2xl border border-border"
            />

            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Gõ địa chỉ để nhận gợi ý tự động. Bạn cũng có thể click trực tiếp lên bản đồ để lấy vị trí gần đúng.
            </p>

            {statusMessage ? (
                <p className="mt-2 text-xs font-medium text-foreground">{statusMessage}</p>
            ) : null}
        </div>
    );
}
