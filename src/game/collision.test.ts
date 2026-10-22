import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPointInsideCircle,
  checkFootBallCollision,
  toCanvasCoords,
  calculateKickScore,
} from './collision.ts';

test('isPointInsideCircle returns true when point is within radius', () => {
  assert.equal(isPointInsideCircle(100, 100, 100, 100, 50), true);
  assert.equal(isPointInsideCircle(130, 140, 100, 100, 60), true);
  assert.equal(isPointInsideCircle(200, 200, 100, 100, 50), false);
});

test('checkFootBallCollision detects foot hit with padding', () => {
  const ball = { x: 300, y: 500, radius: 45 };
  const footInside = [{ x: 320, y: 510 }];
  const footNearWithPadding = [{ x: 350, y: 500 }]; // distance 50 > 45, but < 45+15=60
  const footFar = [{ x: 100, y: 200 }];

  assert.equal(checkFootBallCollision(footInside, ball), true);
  assert.equal(checkFootBallCollision(footNearWithPadding, ball), true);
  assert.equal(checkFootBallCollision(footFar, ball), false);
});

test('toCanvasCoords mirrors x-coordinate properly for mirror AR experience', () => {
  const width = 1000;
  const height = 800;

  // Normalized x = 0.2 (left in raw camera) -> should become 0.8 in mirrored canvas (right side for user)
  const mirrored = toCanvasCoords(0.2, 0.5, width, height, true);
  assert.equal(mirrored.x, 800);
  assert.equal(mirrored.y, 400);

  // Non-mirrored
  const nonMirrored = toCanvasCoords(0.2, 0.5, width, height, false);
  assert.equal(nonMirrored.x, 200);
  assert.equal(nonMirrored.y, 400);
});

test('calculateKickScore rewards consecutive correct streaks', () => {
  const zeroStreak = calculateKickScore(0);
  assert.equal(zeroStreak.points, 20);
  assert.equal(zeroStreak.bonus, 0);

  const twoStreak = calculateKickScore(2);
  assert.equal(twoStreak.points, 25);
  assert.equal(twoStreak.bonus, 5);

  const bigStreak = calculateKickScore(10);
  assert.equal(bigStreak.points, 40); // capped bonus: 4 * 5 = 20 bonus
});

test('2-player mode partitions foot coordinates by screen half', () => {
  const canvasWidth = 1000;
  const dividerX = canvasWidth / 2; // 500

  const feet = [
    { x: 180, y: 700 }, // Player 1
    { x: 420, y: 720 }, // Player 1
    { x: 550, y: 690 }, // Player 2
    { x: 880, y: 710 }, // Player 2
  ];

  const p1Feet = feet.filter((f) => f.x < dividerX);
  const p2Feet = feet.filter((f) => f.x >= dividerX);

  assert.equal(p1Feet.length, 2);
  assert.equal(p2Feet.length, 2);
  assert.equal(p1Feet[0].x, 180);
  assert.equal(p2Feet[0].x, 550);
});
