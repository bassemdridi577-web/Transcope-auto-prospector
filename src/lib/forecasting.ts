/**
 * Utility functions for statistical price forecasting without AI.
 */

export interface PredictionResult {
  direction: 'up' | 'down' | 'stable';
  confidence: number;
  slope: number;
  expectedChange: number;
}

/**
 * Predicts the next price trend based on historical data using Linear Regression.
 * @param history Array of price points with timestamps
 * @returns Prediction result or null if insufficient data
 */
export function predictPriceTrend(history: { price: number; timestamp: string }[]): PredictionResult | null {
  if (!history || history.length < 5) return null;

  // We use the index as X (time) and price as Y
  const n = history.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  history.forEach((point, i) => {
    const x = i;
    const y = Number(point.price);
    if (!isNaN(y)) {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }
  });

  const denominator = (n * sumXX - sumX * sumX);
  if (denominator === 0 || isNaN(denominator)) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared for confidence
  let ssRes = 0;
  let ssTot = 0;
  const meanY = sumY / n;

  history.forEach((point, i) => {
    const x = i;
    const y = Number(point.price);
    const fit = slope * x + intercept;
    ssRes += Math.pow(y - fit, 2);
    ssTot += Math.pow(y - meanY, 2);
  });

  const rSquared = ssTot <= 0 ? 0 : Math.max(0, 1 - (ssRes / ssTot));
  
  const confidence = Math.min(Math.round(rSquared * 100), 100);

  // Direction logic
  const threshold = Math.abs(meanY) * 0.0001; 
  let direction: 'up' | 'down' | 'stable' = 'stable';
  
  if (slope > threshold) direction = 'up';
  else if (slope < -threshold) direction = 'down';

  // Expected change percentage for the next "period"
  const lastPrice = Number(history[history.length - 1].price);
  const expectedChange = (lastPrice && lastPrice !== 0) ? (slope / lastPrice) * 100 : 0;

  return {
    direction,
    confidence: isNaN(confidence) ? 0 : confidence,
    slope: isNaN(slope) ? 0 : slope,
    expectedChange: isNaN(expectedChange) ? 0 : expectedChange
  };
}
