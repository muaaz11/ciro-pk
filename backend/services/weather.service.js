import axios from 'axios';
const KARACHI_LAT = 24.8607;
const KARACHI_LNG = 67.0104;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

async function getKarachiWeather() {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${KARACHI_LAT}&lon=${KARACHI_LNG}` +
      `&appid=${OPENWEATHER_API_KEY}` +
      `&units=metric`;  

    const response = await axios.get(url);
    const data = response.data;

    return {
      source: 'openweathermap_live',
      city: 'Karachi',
      timestamp: new Date().toISOString(),
      temperature_celsius: data.main.temp,
      feels_like_celsius: data.main.feels_like,
      humidity_percent: data.main.humidity,
      weather_condition: data.weather[0].description,
      wind_speed_mps: data.wind.speed,
      heat_index: calculateHeatIndex(data.main.temp, data.main.humidity),
      heatwave_alert: data.main.temp >= 40,        
      extreme_heat_alert: data.main.temp >= 44, 
    };

  } catch (error) {
    console.error('Weather API failed, using fallback mock:', error.message);
    return getMockWeather();
  }
}

function calculateHeatIndex(tempC, humidity) {
  const T = (tempC * 9/5) + 32; 
  const H = humidity;

  const HI = -42.379
    + 2.04901523 * T
    + 10.14333127 * H
    - 0.22475541 * T * H
    - 0.00683783 * T * T
    - 0.05481717 * H * H
    + 0.00122874 * T * T * H
    + 0.00085282 * T * H * H
    - 0.00000199 * T * T * H * H;

  const heatIndexC = (HI - 32) * 5/9;

  return {
    value_celsius: Math.round(heatIndexC * 10) / 10,
    risk_level: heatIndexC >= 54 ? 'EXTREME_DANGER'
              : heatIndexC >= 41 ? 'DANGER'
              : heatIndexC >= 32 ? 'EXTREME_CAUTION'
              : heatIndexC >= 27 ? 'CAUTION'
              : 'SAFE'
  };
}

function getMockWeather() {
  return {
    source: 'mock_fallback',
    city: 'Karachi',
    timestamp: new Date().toISOString(),
    temperature_celsius: 44.2,
    feels_like_celsius: 48.5,
    humidity_percent: 62,
    weather_condition: 'haze',
    wind_speed_mps: 3.1,
    heat_index: {
      value_celsius: 52.8,
      risk_level: 'EXTREME_DANGER'
    },
    heatwave_alert: true,
    extreme_heat_alert: true,
  };
}

module.exports = { getKarachiWeather };