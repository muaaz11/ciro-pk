import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function extractLocationFromText(text) {
  if (!text || !text.trim()) {
    return { found: false, source: 'gps_fallback', patient_count: 1 };
  }

  try {
    const systemPrompt = `You are a crisis report parser for Karachi, Pakistan.
Analyze the emergency signal text (which may be in English, Urdu, or Roman Urdu) and extract:
1. "placeName": The specific landmark, area, or street mentioned in the report (e.g., "DHA Suffa", "NEEPA Chowrangi", "Gulshan-e-Iqbal").
2. "patient_count": The exact count of patients, victims, or affected people mentioned (e.g., "2 log gire hain" -> 2, "do log behosh" -> 2, "3 people collapsed" -> 3, "ek banda behosh hai" -> 1). If no count is mentioned in the text, you MUST default to 1.

Reply ONLY with valid JSON. No explanation. No backticks.
{
  "found": true,
  "placeName": "Landmark Name, Karachi",
  "patient_count": 2
}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.1
    });

    const content = response.choices[0].message.content;
    const cleanContent = content.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleanContent);

    const parsedCount = typeof result.patient_count === 'number' ? result.patient_count : parseInt(result.patient_count) || 1;

    if (result.found && result.placeName) {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        console.warn("[Location Extractor] GOOGLE_MAPS_API_KEY / GOOGLE_API_KEY is not defined in environment variables. Falling back to GPS.");
        return { found: false, source: 'gps_fallback', patient_count: parsedCount };
      }

      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(result.placeName + ', Karachi, Pakistan')}&key=${apiKey}`;
      const geoResponse = await fetch(geocodeUrl);
      
      if (!geoResponse.ok) {
        console.error(`[Location Extractor] Geocoding API request failed with status: ${geoResponse.status}`);
        return { found: false, source: 'gps_fallback', patient_count: parsedCount };
      }

      const geoData = await geoResponse.json();

      if (geoData.status === 'OK' && geoData.results && geoData.results.length > 0) {
        const firstResult = geoData.results[0];
        const lat = firstResult.geometry.location.lat;
        const lng = firstResult.geometry.location.lng;
        return {
          found: true,
          lat,
          lng,
          name: firstResult.formatted_address,
          source: 'text_extraction',
          patient_count: parsedCount
        };
      } else {
        console.log(`[Location Extractor] Geocoding failed with status: ${geoData.status} for place: ${result.placeName}. Error: ${geoData.error_message || 'None'}`);
        return { found: false, source: 'gps_fallback', patient_count: parsedCount };
      }
    }

    return { found: false, source: 'gps_fallback', patient_count: parsedCount };
  } catch (error) {
    console.error("[Location Extractor] Error extracting location:", error);
    return { found: false, source: 'gps_fallback', patient_count: 1 };
  }
}

export default extractLocationFromText;
