export async function fetchNewsWithGemini(region: string) {
  // Instead of simulating, we now trigger the real automation backend
  // which uses SearXNG and Gemini to find and save real articles.
  try {
    const response = await fetch('/api/automation/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error) {
    console.error("Error triggering automation:", error);
  }
}
