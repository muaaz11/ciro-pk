import dotenv from 'dotenv';
dotenv.config();

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Consistent bed simulation — same hospital always gets same bed count across runs
function simulateBeds(hospitalName) {
  let hash = 0;
  for (let c of hospitalName) hash = (hash * 31 + c.charCodeAt(0)) % 100;
  if (hash < 30) return 0;
  return (hash % 15) + 1;
}

export async function findNearestAvailableHospital(incidentLat, incidentLng, emitCallback, patientCount = 1) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn('[HospitalService] No Google API key found. Returning null.');
    if (emitCallback) emitCallback({ event: 'no_hospital_found' });
    return null;
  }

  let data;
  try {
    const url = `https://places.googleapis.com/v1/places:searchNearby`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.location,places.formattedAddress,places.id'
      },
      body: JSON.stringify({
        includedTypes: ['hospital'],
        maxResultCount: 5,
        rankPreference: 'DISTANCE',
        locationRestriction: {
          circle: {
            center: { latitude: incidentLat, longitude: incidentLng },
            radius: 10000.0
          }
        }
      })
    });
    data = await response.json();
  } catch (err) {
    console.error('[HospitalService] Google Places API error:', err.message);
    if (emitCallback) emitCallback({ event: 'no_hospital_found' });
    return null;
  }

  if (!data.places || data.places.length === 0) {
    console.warn('[HospitalService] No hospitals found. Response:', JSON.stringify(data));
    if (emitCallback) emitCallback({ event: 'no_hospital_found' });
    return null;
  }

  const hospitals = data.places.slice(0, 5).map(result => ({
    name: result.displayName?.text || 'Unknown Hospital',
    lat: result.location?.latitude,
    lng: result.location?.longitude,
    vicinity: result.formattedAddress || '',
    place_id: result.id,
    emergencyBeds: simulateBeds(result.displayName?.text || '')
  }));
  // Loop through, simulate calling each one
  for (const hospital of hospitals) {
    const distance = haversineKm(incidentLat, incidentLng, hospital.lat, hospital.lng);
    hospital.distance = distance;

    if (emitCallback) emitCallback({ event: 'hospital_calling', hospital: hospital.name, distance, beds: hospital.emergencyBeds });
    await new Promise(r => setTimeout(r, 2000));

    if (hospital.emergencyBeds >= patientCount) {
      if (emitCallback) emitCallback({ event: 'hospital_confirmed', hospital: hospital.name, beds: patientCount, distance, address: hospital.vicinity, lat: hospital.lat, lng: hospital.lng });
      return { ...hospital, emergencyBeds: patientCount };
    } else {
      if (emitCallback) emitCallback({ event: 'hospital_full', hospital: hospital.name });
    }
  }

  if (emitCallback) emitCallback({ event: 'no_hospital_found' });
  return null;
}
