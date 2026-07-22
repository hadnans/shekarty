// GGH Delivery System Configuration
// Centralized configuration for the delivery tracking system

/** Default radius in km to search for nearby drivers */
export const DRIVER_SEARCH_RADIUS_KM = 15;

/** Maximum active deliveries a driver can handle simultaneously */
export const MAX_ACTIVE_DELIVERIES_PER_DRIVER = 3;

/** Minimum driver rating to be eligible for auto-assignment */
export const MIN_DRIVER_RATING = 3.5;

/** Time in minutes before an unaccepted assignment expires */
export const ASSIGNMENT_EXPIRY_MINUTES = 15;

/** Time-of-day traffic multipliers for ETA calculation */
export const TRAFFIC_MULTIPLIERS: Record<string, number> = {
  morning_rush: 1.4,   // 7:00 - 9:00
  midday: 1.0,         // 9:00 - 12:00
  lunch_rush: 1.3,     // 12:00 - 14:00
  afternoon: 1.1,      // 14:00 - 16:00
  evening_rush: 1.5,   // 16:00 - 19:00
  night: 0.9,          // 19:00 - 23:00
  late_night: 0.8,     // 23:00 - 7:00
};

/** Average speed in km/h for different vehicle types */
export const VEHICLE_SPEED_KMH: Record<string, number> = {
  motorcycle: 25,
  car: 30,
  van: 25,
  truck: 20,
};

/** Default vehicle type when none specified */
export const DEFAULT_VEHICLE_TYPE = 'motorcycle';

/** Average time in minutes for warehouse packing */
export const AVERAGE_PACKING_TIME_MINUTES = 20;

/** Average time in minutes for driver pickup at warehouse */
export const AVERAGE_PICKUP_TIME_MINUTES = 10;

/** Average time in minutes for handoff process */
export const AVERAGE_HANDOFF_TIME_MINUTES = 5;

/** Delivery time window width in minutes */
export const DELIVERY_WINDOW_MINUTES = 60;

/** Scoring weights for driver auto-assignment */
export const ASSIGNMENT_WEIGHTS = {
  distance: 0.4,
  rating: 0.35,
  currentLoad: 0.25,
} as const;

/**
 * Get the current traffic multiplier based on time of day
 */
export function getCurrentTrafficMultiplier(): number {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 9) return TRAFFIC_MULTIPLIERS.morning_rush;
  if (hour >= 9 && hour < 12) return TRAFFIC_MULTIPLIERS.midday;
  if (hour >= 12 && hour < 14) return TRAFFIC_MULTIPLIERS.lunch_rush;
  if (hour >= 14 && hour < 16) return TRAFFIC_MULTIPLIERS.afternoon;
  if (hour >= 16 && hour < 19) return TRAFFIC_MULTIPLIERS.evening_rush;
  if (hour >= 19 && hour < 23) return TRAFFIC_MULTIPLIERS.night;
  return TRAFFIC_MULTIPLIERS.late_night;
}
