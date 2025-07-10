// Generate a unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Format time as HH:MM:SS
export function formatTime(milliseconds: number): string {
  const seconds = Math.floor((milliseconds / 1000) % 60);
  const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Parse Azure Speech endpoint to extract region
export function extractRegionFromEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    const hostnameParts = url.hostname.split('.');
    if (hostnameParts.length > 0) {
      return hostnameParts[0];
    }
  } catch (error) {
    // Invalid URL
  }
  
  return '';
}

// Check if text contains a question based on simple heuristics
// This is a fallback for when AI detection is not available
export function isQuestion(text: string): boolean {
  const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'which', 'whose', 'whom', 'can', 'could', 'would', 'should', 'will', 'do', 'does', 'did', 'is', 'are', 'was', 'were'];
  
  // Check if the text ends with a question mark
  if (text.trim().endsWith('?')) {
    return true;
  }
  
  // Check if the text starts with a question word
  const firstWord = text.trim().toLowerCase().split(' ')[0];
  if (questionWords.includes(firstWord)) {
    return true;
  }
  
  return false;
}