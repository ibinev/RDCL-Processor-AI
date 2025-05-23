/**
 * Formats a date number (days since 01/01/1900) to DD/MM/YYYY format
 * @param {number} dateNumber - Number of days since 01/01/1900
 * @returns {string} Formatted date string (DD/MM/YYYY)
 */
export const formatDate = (dateNumber) => {
  if (!dateNumber) return '';
  
  // Convert Excel date number to JavaScript Date
  // Excel's epoch starts on 1900-01-01, but it incorrectly considers 1900 as a leap year
  // We need to adjust for this by subtracting 1 day if the date is after 1900-02-28
  const excelEpoch = new Date(1900, 0, 2);
  const daysToAdd = dateNumber - 1; // Subtract 1 because Excel's epoch is 1, not 0
  
  const date = new Date(excelEpoch);
  date.setDate(date.getDate() + daysToAdd);
  
  // Format the date as DD/MM/YYYY
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Formats minutes into HH:mm time format
 * @param {number} minutes - Number of minutes since midnight
 * @returns {string} Formatted time string (HH:mm)
 */
export const formatTime = (minutes) => {
  if (!minutes && minutes !== 0) return '';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}; 