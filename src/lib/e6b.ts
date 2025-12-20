
/**
 * @fileoverview A collection of flight planning calculation utilities based on E6B flight computer logic.
 */

// --- Helper Functions ---

/** Converts degrees to radians. */
const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

/** Converts radians to degrees. */
const toDegrees = (radians: number): number => radians * (180 / Math.PI);

interface Point {
    lat: number;
    lon: number;
}

/**
 * Calculates the great-circle distance between two points on Earth using the Haversine formula.
 * @param p1 - The first point with latitude and longitude.
 * @param p2 - The second point with latitude and longitude.
 * @returns The distance in nautical miles.
 */
export const getDistance = (p1: Point, p2: Point): number => {
    const R = 3440.065; // Earth's radius in nautical miles
    const dLat = toRadians(p2.lat - p1.lat);
    const dLon = toRadians(p2.lon - p1.lon);
    const lat1 = toRadians(p1.lat);
    const lat2 = toRadians(p2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

/**
 * Calculates the initial bearing (forward azimuth) from one point to another.
 * @param p1 - The starting point with latitude and longitude.
 * @param p2 - The destination point with latitude and longitude.
 * @returns The bearing in degrees.
 */
export const getBearing = (p1: Point, p2: Point): number => {
    const lat1 = toRadians(p1.lat);
    const lon1 = toRadians(p1.lon);
    const lat2 = toRadians(p2.lat);
    const lon2 = toRadians(p2.lon);

    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    
    const bearing = toDegrees(Math.atan2(y, x));
    return (bearing + 360) % 360; // Normalize to 0-359
};

// --- Core E6B Calculations ---

interface WindTriangleInput {
    trueCourse: number;      // Degrees
    trueAirspeed: number;    // Knots
    windDirection: number;   // Degrees (from)
    windSpeed: number;       // Knots
}

interface WindTriangleOutput {
    windCorrectionAngle: number; // Degrees
    heading: number;             // Degrees
    groundSpeed: number;         // Knots
}

/**
 * Solves the wind triangle to find heading, ground speed, and wind correction angle.
 * @param input - The true course, true airspeed, wind direction, and wind speed.
 * @returns An object containing the calculated WCA, heading, and ground speed.
 */
export const calculateWindTriangle = (input: WindTriangleInput): WindTriangleOutput => {
    const { trueCourse, trueAirspeed, windDirection, windSpeed } = input;

    if (trueAirspeed <= 0) {
        return { windCorrectionAngle: 0, heading: trueCourse, groundSpeed: 0 };
    }
    if (windSpeed <= 0) {
        return { windCorrectionAngle: 0, heading: trueCourse, groundSpeed: trueAirspeed };
    }

    const tcRad = toRadians(trueCourse);
    const wdRad = toRadians(windDirection);

    // Calculate wind correction angle (WCA) using the law of sines
    const sinWca = (windSpeed * Math.sin(wdRad - tcRad)) / trueAirspeed;
    
    // Check if the wind is too strong for the aircraft to make headway
    if (Math.abs(sinWca) > 1) {
        // This scenario means the wind is stronger than the TAS can counteract
        // Returning 0s is a safe fallback, though in a real E6B this is an "impossible" calculation
        return { windCorrectionAngle: 0, heading: trueCourse, groundSpeed: 0 };
    }

    const wcaRad = Math.asin(sinWca);
    const windCorrectionAngle = toDegrees(wcaRad);

    // Calculate heading
    const trueHeading = trueCourse + windCorrectionAngle;

    // Calculate ground speed using the law of cosines
    const groundSpeed = Math.sqrt(
        Math.pow(trueAirspeed, 2) + Math.pow(windSpeed, 2) -
        2 * trueAirspeed * windSpeed * Math.cos(tcRad - wdRad + wcaRad)
    );
    
    return {
        windCorrectionAngle: windCorrectionAngle,
        heading: (trueHeading + 360) % 360, // Normalize heading
        groundSpeed: groundSpeed,
    };
};
