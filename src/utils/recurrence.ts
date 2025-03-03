import pkg from 'rrule';
const { rrulestr } = pkg;

interface TimeRange {
  startTime: number;
  endTime: number;
}

/**
 * Check if a recurring event occurs within a specified time range
 * @param recurrenceRule - Recurrence rule string in RFC 5545 format
 * @param eventTime - Event's start and end time (Unix timestamp in seconds)
 * @param checkRange - Time range to check against (Unix timestamp in seconds)
 * @returns boolean - Whether any recurrence of the event falls within the check range
 */
export function isRecurrenceInRange(
  recurrenceRule: string,
  eventTime: TimeRange,
  checkRange: TimeRange
): boolean {
  try {
    // If recurrence rule is empty, return false
    if (!recurrenceRule) {
      return false;
    }

    // Calculate event duration in seconds
    const eventDuration = eventTime.endTime - eventTime.startTime;

    // Convert timestamps to Date objects
    const eventStart = new Date(eventTime.startTime * 1000);
    const checkStart = new Date(checkRange.startTime * 1000);
    const checkEnd = new Date(checkRange.endTime * 1000);

    // Parse the recurrence rule
    // Note: rrulestr expects the complete RRULE: prefix
    const rruleString = recurrenceRule.startsWith('RRULE:') 
      ? recurrenceRule 
      : `RRULE:${recurrenceRule}`;
    
    const rule = rrulestr(rruleString, {
      dtstart: eventStart
    });

    // Get all occurrences within the check range
    const occurrences = rule.between(checkStart, checkEnd, true);

    // Check if any recurrence event's time range overlaps with the check range
    return occurrences.some(occurrence => {
      const occurrenceStart = Math.floor(occurrence.getTime() / 1000);
      const occurrenceEnd = occurrenceStart + eventDuration;

      return (
        // Recurrence start time is within check range
        (occurrenceStart >= checkRange.startTime && 
         occurrenceStart <= checkRange.endTime) ||
        // Recurrence end time is within check range
        (occurrenceEnd >= checkRange.startTime && 
         occurrenceEnd <= checkRange.endTime) ||
        // Recurrence completely contains check range
        (occurrenceStart <= checkRange.startTime && 
         occurrenceEnd >= checkRange.endTime)
      );
    });
  } catch (error) {
    console.error('Error checking recurrence:', error);
    return false;
  }
}