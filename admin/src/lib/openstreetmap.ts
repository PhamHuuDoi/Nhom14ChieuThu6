export type OpenStreetMapLocationSelection = {
  placeId: string | null
  formattedAddress: string
  addressLine: string
  provinceName: string
  districtName: string
  wardName: string
  latitude: number | null
  longitude: number | null
}

type NominatimAddress = {
  road?: string
  pedestrian?: string
  footway?: string
  house_number?: string
  neighbourhood?: string
  suburb?: string
  quarter?: string
  village?: string
  hamlet?: string
  city?: string
  town?: string
  municipality?: string
  county?: string
  state?: string
  city_district?: string
}

type NominatimResult = {
  place_id?: number | string
  lat?: string
  lon?: string
  display_name?: string
  name?: string
  address?: NominatimAddress
}

function joinAddressParts(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ")
}

export function normalizeLocationName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(
      /\b(thanh pho|tp\.?|tinh|quan|q\.?|huyen|h\.?|phuong|p\.?|xa|thi tran|tt\.?|thi xa|tx\.?)\b/g,
      ""
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function parseNominatimLocation(
  result: NominatimResult
): OpenStreetMapLocationSelection | null {
  const latitude = Number(result.lat)
  const longitude = Number(result.lon)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  const address = result.address || {}
  const addressLine =
    joinAddressParts([
      address.house_number,
      address.road || address.pedestrian || address.footway,
      address.neighbourhood || address.suburb || address.quarter,
    ]) ||
    result.name ||
    result.display_name ||
    ""

  return {
    placeId: result.place_id ? String(result.place_id) : null,
    formattedAddress: result.display_name || addressLine,
    addressLine,
    provinceName: address.state || "",
    districtName:
      address.county || address.city_district || address.city || address.town || "",
    wardName:
      address.suburb || address.quarter || address.village || address.hamlet || "",
    latitude,
    longitude,
  }
}

export async function searchOpenStreetMap(query: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=vn&q=${encodeURIComponent(
      query
    )}`,
    {
      headers: {
        "Accept-Language": "vi",
      },
    }
  )

  if (!response.ok) {
    throw new Error("Không thể tìm địa chỉ từ OpenStreetMap")
  }

  const data = (await response.json()) as NominatimResult[]
  return data
    .map(parseNominatimLocation)
    .filter(Boolean) as OpenStreetMapLocationSelection[]
}

export async function reverseGeocodeOpenStreetMap(
  latitude: number,
  longitude: number
) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${latitude}&lon=${longitude}`,
    {
      headers: {
        "Accept-Language": "vi",
      },
    }
  )

  if (!response.ok) {
    throw new Error("Không thể đọc địa chỉ từ vị trí đã chọn")
  }

  const data = (await response.json()) as NominatimResult
  return parseNominatimLocation(data)
}
