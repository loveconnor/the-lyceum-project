/**
 * Utility functions for formatting duration
 */

/**
 * Format minutes into a human-readable duration string
 * @param minutes - Duration in minutes
 * @returns Formatted duration string (e.g., "2-3 hours", "25-30 hours")
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) {
    return "Time varies";
  }

  const hours = minutes / 60;

  // For very short durations (< 2 hours)
  if (hours < 2) {
    const roundedMinutes = Math.round(minutes / 15) * 15; // Round to nearest 15 minutes
    return `${roundedMinutes} min`;
  }

  // For short durations (2-10 hours) - show single hour estimate
  if (hours < 10) {
    const roundedHours = Math.ceil(hours);
    return `${roundedHours} ${roundedHours === 1 ? 'hour' : 'hours'}`;
  }

  // For medium durations (10-40 hours) - show range
  if (hours < 40) {
    const lowerBound = Math.floor(hours / 5) * 5;
    const upperBound = lowerBound + 5;
    return `${lowerBound}-${upperBound} hours`;
  }

  // For longer durations - convert to weeks
  const weeks = hours / 7; // Assuming ~7 hours of study per week
  
  if (weeks < 4) {
    const lowerWeeks = Math.floor(weeks);
    const upperWeeks = Math.ceil(weeks);
    if (lowerWeeks === upperWeeks) {
      return `${lowerWeeks} ${lowerWeeks === 1 ? 'week' : 'weeks'}`;
    }
    return `${lowerWeeks}-${upperWeeks} weeks`;
  }

  // For very long durations - show weeks with larger ranges
  const lowerWeeks = Math.floor(weeks / 2) * 2;
  const upperWeeks = lowerWeeks + 2;
  return `${lowerWeeks}-${upperWeeks} weeks`;
}
