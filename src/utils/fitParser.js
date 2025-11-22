// FIT File Parser - Browser Compatible
// Install: npm install fit-file-parser

import FitParser from 'fit-file-parser';

/**
 * Parse a FIT file and extract structured data
 * @param {File} file - The FIT file from an input element
 * @returns {Promise<Object>} Parsed activity data
 */
export async function parseFitFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const arrayBuffer = e.target.result;
                const fitParser = new FitParser({
                    force: true,
                    speedUnit: 'km/h',
                    lengthUnit: 'km',
                    temperatureUnit: 'celsius',
                    elapsedRecordField: true,
                    mode: 'both'
                });

                fitParser.parse(arrayBuffer, (error, data) => {
                    if (error) {
                        reject(error);
                    } else {
                        const structured = structureFitData(data);
                        resolve(structured);
                    }
                });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Structure the raw FIT data into a more usable format
 * @param {Object} data - Raw data from fit-file-parser
 * @returns {Object} Structured activity data
 */
function structureFitData(data) {
    const records = data.records || [];
    const session = data.sessions?.[0] || {};
    const activity = data.activity || {};

    // Extract GPS coordinates and metrics
    const points = records
        .filter(r => r.position_lat && r.position_long)
        .map(r => ({
            lat: r.position_lat,
            lng: r.position_long,
            timestamp: r.timestamp,
            altitude: r.altitude,
            heartRate: r.heart_rate,
            cadence: r.cadence,
            speed: r.speed,
            power: r.power,
            temperature: r.temperature,
            distance: r.distance
        }));

    // Calculate summary statistics
    const summary = {
        sport: session.sport || activity.sport || 'unknown',
        startTime: session.start_time || activity.timestamp,
        totalDistance: session.total_distance || 0,
        totalTime: session.total_elapsed_time || 0,
        totalMovingTime: session.total_timer_time || 0,
        avgSpeed: session.avg_speed || 0,
        maxSpeed: session.max_speed || 0,
        avgHeartRate: session.avg_heart_rate,
        maxHeartRate: session.max_heart_rate,
        avgCadence: session.avg_cadence,
        maxCadence: session.max_cadence,
        avgPower: session.avg_power,
        maxPower: session.max_power,
        totalCalories: session.total_calories,
        totalAscent: session.total_ascent,
        totalDescent: session.total_descent
    };

    // Extract lap data if available
    const laps = (data.laps || []).map(lap => ({
        startTime: lap.start_time,
        totalDistance: lap.total_distance,
        totalTime: lap.total_elapsed_time,
        avgSpeed: lap.avg_speed,
        avgHeartRate: lap.avg_heart_rate,
        avgCadence: lap.avg_cadence,
        avgPower: lap.avg_power,
        maxSpeed: lap.max_speed,
        maxHeartRate: lap.max_heart_rate
    }));

    return {
        summary,
        points,
        laps,
        rawData: data // Keep raw data for advanced use
    };
}

/**
 * Get elevation profile from points
 * @param {Array} points - GPS points with altitude
 * @returns {Array} Array of {distance, elevation} objects
 */
export function getElevationProfile(points) {
    return points
        .filter(p => p.altitude !== undefined)
        .map(p => ({
            distance: p.distance,
            elevation: p.altitude
        }));
}

/**
 * Get heart rate over time/distance
 * @param {Array} points - GPS points with heart rate
 * @returns {Array} Array of {distance, heartRate} objects
 */
export function getHeartRateData(points) {
    return points
        .filter(p => p.heartRate !== undefined)
        .map(p => ({
            distance: p.distance,
            heartRate: p.heartRate,
            timestamp: p.timestamp
        }));
}

/**
 * Get power data over time/distance
 * @param {Array} points - GPS points with power
 * @returns {Array} Array of {distance, power} objects
 */
export function getPowerData(points) {
    return points
        .filter(p => p.power !== undefined)
        .map(p => ({
            distance: p.distance,
            power: p.power,
            timestamp: p.timestamp
        }));
}

// Example usage:
/*
const fileInput = document.getElementById('fit-file-input');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    try {
      const data = await parseFitFile(file);
      console.log('Summary:', data.summary);
      console.log('GPS Points:', data.points.length);
      console.log('Laps:', data.laps);
      
      // Get specific data for charts
      const elevation = getElevationProfile(data.points);
      const heartRate = getHeartRateData(data.points);
      const power = getPowerData(data.points);
      
    } catch (error) {
      console.error('Error parsing FIT file:', error);
    }
  }
});
*/