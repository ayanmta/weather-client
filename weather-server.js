// weather-server.js
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// AccuWeather API key - you'll need to get your own from developer.accuweather.com
const API_KEY = process.env.ACCUWEATHER_API_KEY;

// Base URLs for AccuWeather APIs
const LOCATION_BASE_URL = 'http://dataservice.accuweather.com/locations/v1/cities/search';
const CURRENT_CONDITIONS_BASE_URL = 'http://dataservice.accuweather.com/currentconditions/v1/';
const FORECAST_BASE_URL = 'http://dataservice.accuweather.com/forecasts/v1/daily/5day/';

// Middleware
app.use(express.json());
app.use(express.static('public')); // Serve static files from public directory

// Route to get current weather by city name
app.get('/api/weather/:city', async (req, res) => {
  try {
    const city = req.params.city;
    
    // Step 1: Get the location key for the city
    const locationResponse = await axios.get(`${LOCATION_BASE_URL}?apikey=${API_KEY}&q=${city}`);
    
    if (!locationResponse.data || locationResponse.data.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const locationKey = locationResponse.data[0].Key;
    const locationName = locationResponse.data[0].LocalizedName;
    const countryName = locationResponse.data[0].Country.LocalizedName;
    
    // Step 2: Get current conditions using the location key
    const currentConditionsResponse = await axios.get(`${CURRENT_CONDITIONS_BASE_URL}${locationKey}?apikey=${API_KEY}`);
    
    if (!currentConditionsResponse.data || currentConditionsResponse.data.length === 0) {
      return res.status(404).json({ error: 'Weather data not found' });
    }
    
    const currentConditions = currentConditionsResponse.data[0];
    
    // Step 3: Get 5-day forecast
    const forecastResponse = await axios.get(`${FORECAST_BASE_URL}${locationKey}?apikey=${API_KEY}`);
    
    // Step 4: Format and return the weather data
    const weatherData = {
      location: {
        name: locationName,
        country: countryName,
        key: locationKey
      },
      current: {
        temperature: {
          metric: currentConditions.Temperature.Metric.Value,
          imperial: currentConditions.Temperature.Imperial.Value
        },
        weatherText: currentConditions.WeatherText,
        weatherIcon: currentConditions.WeatherIcon,
        hasRain: currentConditions.HasPrecipitation,
        precipitationType: currentConditions.PrecipitationType,
        isDayTime: currentConditions.IsDayTime,
        observationTime: currentConditions.LocalObservationDateTime
      },
      forecast: forecastResponse.data.DailyForecasts.map(day => ({
        date: day.Date,
        temperature: {
          min: {
            metric: ((day.Temperature.Minimum.Value - 32) * 5/9).toFixed(1),
            imperial: day.Temperature.Minimum.Value
          },
          max: {
            metric: ((day.Temperature.Maximum.Value - 32) * 5/9).toFixed(1),
            imperial: day.Temperature.Maximum.Value
          }
        },
        day: {
          iconPhrase: day.Day.IconPhrase,
          hasPrecipitation: day.Day.HasPrecipitation,
          precipitationType: day.Day.PrecipitationType
        },
        night: {
          iconPhrase: day.Night.IconPhrase,
          hasPrecipitation: day.Night.HasPrecipitation,
          precipitationType: day.Night.PrecipitationType
        }
      }))
    };
    
    res.json(weatherData);
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Simple home route that redirects to the index.html
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// Start the server
app.listen(port, () => {
  console.log(`Weather server listening at http://localhost:${port}`);
});