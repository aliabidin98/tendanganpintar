/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Circle2D {
  x: number;
  y: number;
  radius: number;
}

/**
 * Checks if a point is within a circular area.
 */
export function isPointInsideCircle(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Checks if any of the tracked foot points hit the ball.
 * An extra hitPadding allows a forgiving, responsive AR feel.
 */
export function checkFootBallCollision(
  feet: Point2D[],
  ball: Circle2D,
  hitPadding = 15
): boolean {
  const effectiveRadius = ball.radius + hitPadding;
  const effectiveRadiusSq = effectiveRadius * effectiveRadius;

  for (const foot of feet) {
    const dx = foot.x - ball.x;
    const dy = foot.y - ball.y;
    if (dx * dx + dy * dy <= effectiveRadiusSq) {
      return true;
    }
  }
  return false;
}

/**
 * Convert MediaPipe normalized coordinates (0..1) to mirrored canvas pixel coordinates.
 * Mirrored: x becomes (1 - normX) so user movement acts like looking into a mirror.
 */
export function toCanvasCoords(
  normX: number,
  normY: number,
  canvasWidth: number,
  canvasHeight: number,
  mirrored = true
): Point2D {
  const x = mirrored ? (1 - normX) * canvasWidth : normX * canvasWidth;
  const y = normY * canvasHeight;
  return { x, y };
}

/**
 * Calculate score bonus based on current answer streak.
 */
export function calculateKickScore(streak: number, basePoints = 20): { points: number; bonus: number } {
  const bonusMultiplier = Math.min(Math.floor(streak / 2), 4); // max 4x bonus
  const bonus = bonusMultiplier * 5;
  return {
    points: basePoints + bonus,
    bonus,
  };
}
