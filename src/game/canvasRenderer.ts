/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FootPoint, Ball, GoalkeeperState, GameMode, GoalkeeperCharacter } from '../types/game';
import ballImgSrc from '../assets/images/soccer_ball_3d_1792623887459.jpg';
import lionImgSrc from '../assets/images/goalkeeper_3d_lion_mascot_1792625120782.jpg';
import champImgSrc from '../assets/images/goalkeeper_3d_champion_1792625039927.jpg';
import cyberImgSrc from '../assets/images/goalkeeper_3d_cyber_bot_1792625039944.jpg';

export interface PlayerRenderGroup {
  playerId: 'P1' | 'P2';
  name: string;
  themeColor: string;
  accentColor: string;
  balls: Ball[];
  goalkeeper: GoalkeeperState;
  goalNet: { x: number; y: number; w: number; h: number };
  goalCelebrationTime: number; // 0 to 1
  missCelebrationTime: number; // 0 to 1
  celebrationText?: string;
  subText?: string;
  streak: number;
  activeKickFoot?: { x: number; y: number } | null;
  goalkeeperCharacter?: GoalkeeperCharacter;
}

export interface RenderState {
  width: number;
  height: number;
  mode: GameMode;
  video: HTMLVideoElement | null;
  cameraActive: boolean;
  footPoints: FootPoint[];
  allLandmarks?: { x: number; y: number; visibility: number }[];
  players: PlayerRenderGroup[];
  showSkeleton: boolean;
}

export class ARCanvasRenderer {
  private soccerBallImage: HTMLCanvasElement | null = null;
  private transparent3DBallCanvas: HTMLCanvasElement | null = null;
  private transparent3DGoalkeeperLionCanvas: HTMLCanvasElement | null = null;
  private transparent3DGoalkeeperChampionCanvas: HTMLCanvasElement | null = null;
  private transparent3DGoalkeeperCyberCanvas: HTMLCanvasElement | null = null;
  private particleTrails: { x: number; y: number; radius: number; color: string; alpha: number }[] = [];

  constructor() {
    this.createProcedural3DBallTexture();
    this.load3DAssetImages();
  }

  // Helper to remove black background and produce pristine transparent alpha cutout
  private processBlackBackground(img: HTMLImageElement): HTMLCanvasElement {
    const w = img.naturalWidth || 512;
    const h = img.naturalHeight || 512;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return c;

    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Chroma key out black background with antialiased edge blending
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const maxVal = Math.max(r, g, b);

      if (r < 24 && g < 24 && b < 24) {
        data[i + 3] = 0;
      } else if (r < 40 && g < 40 && b < 40) {
        // Smooth edge antialiasing falloff
        const alpha = Math.max(0, Math.min(255, Math.floor(((maxVal - 24) / 16) * 255)));
        data[i + 3] = alpha;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return c;
  }

  // Preload and convert 3D rendered assets to transparent sprites
  private load3DAssetImages() {
    try {
      // 1. 3D Soccer Ball Render
      const ballImg = new Image();
      ballImg.crossOrigin = 'anonymous';
      ballImg.src = ballImgSrc;
      ballImg.onload = () => {
        try {
          const w = ballImg.naturalWidth || 512;
          const h = ballImg.naturalHeight || 512;
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, (w / 2) * 0.955, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(ballImg, 0, 0, w, h);
            ctx.restore();
            this.transparent3DBallCanvas = c;
          }
        } catch (err) {
          console.warn('Could not process 3D ball canvas:', err);
        }
      };

      // 2. 3D Lion Mascot Goalkeeper (Singa Juara 3D)
      const lionImg = new Image();
      lionImg.crossOrigin = 'anonymous';
      lionImg.src = lionImgSrc;
      lionImg.onload = () => {
        try {
          this.transparent3DGoalkeeperLionCanvas = this.processBlackBackground(lionImg);
        } catch (err) {
          console.warn('Could not process 3D lion mascot:', err);
        }
      };

      // 3. 3D Champion Goalkeeper (Hero Juara 3D)
      const champImg = new Image();
      champImg.crossOrigin = 'anonymous';
      champImg.src = champImgSrc;
      champImg.onload = () => {
        try {
          this.transparent3DGoalkeeperChampionCanvas = this.processBlackBackground(champImg);
        } catch (err) {
          console.warn('Could not process 3D champion keeper:', err);
        }
      };

      // 4. 3D Cyber Bot Goalkeeper (Robo-Bot Siber 3D)
      const cyberImg = new Image();
      cyberImg.crossOrigin = 'anonymous';
      cyberImg.src = cyberImgSrc;
      cyberImg.onload = () => {
        try {
          this.transparent3DGoalkeeperCyberCanvas = this.processBlackBackground(cyberImg);
        } catch (err) {
          console.warn('Could not process 3D cyber keeper:', err);
        }
      };
    } catch (e) {
      console.warn('Could not preload 3D assets:', e);
    }
  }

  // Pre-render a procedural 3D soccer ball fallback
  private createProcedural3DBallTexture() {
    const size = 160;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const r = size / 2;
    // 3D Sphere shading with depth
    const grad = ctx.createRadialGradient(r * 0.65, r * 0.6, r * 0.05, r, r, r);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.3, '#F8FAFC');
    grad.addColorStop(0.7, '#CBD5E1');
    grad.addColorStop(1, '#64748B');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(r, r, r - 4, 0, Math.PI * 2);
    ctx.fill();

    // Pentagons
    ctx.fillStyle = '#0F172A';
    drawPentagon(ctx, r, r, r * 0.28, 0);

    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const px = r + Math.cos(angle) * (r * 0.62);
      const py = r + Math.sin(angle) * (r * 0.62);
      drawPentagon(ctx, px, py, r * 0.22, angle + Math.PI);

      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const cx = r + Math.cos(angle) * (r * 0.28);
      const cy = r + Math.sin(angle) * (r * 0.28);
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.stroke();
    }

    // High gloss 3D specular shine
    const highlight = ctx.createRadialGradient(r * 0.55, r * 0.45, 0, r * 0.55, r * 0.45, r * 0.45);
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    highlight.addColorStop(0.25, 'rgba(255, 255, 255, 0.4)');
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(r, r, r - 4, 0, Math.PI * 2);
    ctx.fill();

    this.soccerBallImage = canvas;
  }

  public render(ctx: CanvasRenderingContext2D, state: RenderState) {
    const { width, height, mode, players } = state;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // 1. Video Background (Mirrored) or Synthetic Stadium Pitch
    if (state.cameraActive && state.video && state.video.readyState >= 2) {
      ctx.save();
      // Mirror horizontally so player's right foot matches screen right
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(state.video, 0, 0, width, height);
      ctx.restore();

      // Atmospheric vignette
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.35,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.85
      );
      vignette.addColorStop(0, 'rgba(15, 23, 42, 0.05)');
      vignette.addColorStop(1, 'rgba(2, 6, 23, 0.6)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    } else {
      this.drawSyntheticPitch(ctx, width, height);
    }

    // 2. Center Dividing Line (in 2-Player Mode)
    if (mode === '2P') {
      this.drawSplitDivider(ctx, width, height);
    }

    // 3. Render Ground Pitch Lines for Augmented Stadium Immersion
    this.drawARPitchFloor(ctx, width, height, mode);

    // 4. Render Goal Nets for each player group
    players.forEach((player) => {
      const isGoalShaking = player.goalCelebrationTime > 0;
      this.drawGoalNet(ctx, player.goalNet, isGoalShaking, player.themeColor);
    });

    // 5. Render 3D Goalkeepers
    players.forEach((player) => {
      this.draw3DGoalkeeper(ctx, player.goalkeeper, player.playerId, player.goalkeeperCharacter);
    });

    // 6. Render Ball Speed Trails
    this.drawBallTrails(ctx);

    // 7. Render 3D Soccer Balls with Transparent Glass Floating Answer Cards
    players.forEach((player) => {
      player.balls.forEach((ball) => {
        this.draw3DBallWithGlassCard(ctx, ball);
      });
    });

    // 8. Render AI MediaPipe Skeleton Line Connections
    if (state.showSkeleton && state.allLandmarks && state.allLandmarks.length > 0) {
      this.drawSkeletonOverlay(ctx, width, height, state.allLandmarks, mode);
    }

    // 9. Render Tracked Foot Coordinates (Ankles & Toes) with Glowing Halos
    this.drawFootTrackers(ctx, state.footPoints, players);

    // 10. Render Goal / Caught Celebratory Overlays
    players.forEach((player) => {
      if (player.goalCelebrationTime > 0) {
        this.drawGoalBurst(
          ctx,
          player.goalNet.x + player.goalNet.w / 2,
          player.goalNet.y + player.goalNet.h / 2,
          player.goalCelebrationTime,
          player.celebrationText || 'GOAL!',
          player.streak
        );
      } else if (player.missCelebrationTime > 0) {
        this.drawMissBanner(
          ctx,
          player.goalNet.x + player.goalNet.w / 2,
          player.goalNet.y + player.goalNet.h / 2,
          player.missCelebrationTime,
          player.celebrationText || 'DITANGKAP KIPER!'
        );
      }
    });

    ctx.restore();
  }

  // Draw AR Pitch lines on the floor
  private drawARPitchFloor(ctx: CanvasRenderingContext2D, width: number, height: number, mode: GameMode) {
    ctx.save();
    const horizonY = height * 0.48;
    const bottomY = height;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2.5;

    // Grass pitch penalty arcs
    if (mode === '1P') {
      const cx = width / 2;
      ctx.beginPath();
      ctx.ellipse(cx, height * 0.62, width * 0.22, height * 0.08, 0, 0, Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(width * 0.18, bottomY);
      ctx.lineTo(width * 0.28, horizonY);
      ctx.moveTo(width * 0.82, bottomY);
      ctx.lineTo(width * 0.72, horizonY);
      ctx.stroke();
    } else {
      [width * 0.25, width * 0.75].forEach((cx) => {
        ctx.beginPath();
        ctx.ellipse(cx, height * 0.62, width * 0.12, height * 0.07, 0, 0, Math.PI);
        ctx.stroke();
      });
    }

    ctx.restore();
  }

  // Draw divider in 2P mode
  private drawSplitDivider(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save();
    const midX = width / 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(midX, 60);
    ctx.lineTo(midX, height - 70);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glass pill divider badge in center
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, midX - 32, height * 0.5 - 14, 64, 28, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', midX, height * 0.5);

    ctx.restore();
  }

  // Fallback synthetic stadium pitch
  private drawSyntheticPitch(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#021024');
    bgGrad.addColorStop(0.45, '#052e16');
    bgGrad.addColorStop(1, '#022c22');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
    const stripes = 7;
    const stripeH = (height * 0.55) / stripes;
    for (let i = 0; i < stripes; i += 2) {
      ctx.fillRect(0, height * 0.45 + i * stripeH, width, stripeH);
    }
  }

  // Draw Realistic 3D Goal Net
  private drawGoalNet(
    ctx: CanvasRenderingContext2D,
    net: { x: number; y: number; w: number; h: number },
    isGoalShaking: boolean,
    themeColor: string
  ) {
    const { x, y, w, h } = net;

    ctx.save();
    if (isGoalShaking) {
      const shakeX = (Math.random() - 0.5) * 8;
      const shakeY = (Math.random() - 0.5) * 6;
      ctx.translate(shakeX, shakeY);
    }

    // Net interior depth
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(x, y, w, h);

    // Grid ropes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.2;
    const step = 16;
    for (let gx = x; gx <= x + w; gx += step) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx + (gx - (x + w / 2)) * 0.08, y + h);
      ctx.stroke();
    }
    for (let gy = y; gy <= y + h; gy += step) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }

    // Goal frame
    ctx.shadowColor = themeColor;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();

    ctx.restore();
  }

  // Draw 3D Goalkeeper Character
  private draw3DGoalkeeper(
    ctx: CanvasRenderingContext2D,
    keeper: GoalkeeperState,
    playerId: 'P1' | 'P2',
    character: GoalkeeperCharacter = 'lion'
  ) {
    ctx.save();
    ctx.translate(keeper.x, keeper.y);
    ctx.rotate(keeper.rotation);

    // Dynamic sizing based on character model proportions
    const keeperSize = character === 'lion' ? 124 : 114;

    // 3D Stadium Floor Shadow under goalkeeper
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, keeperSize * 0.42, keeperSize * 0.35, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Select sprite based on character
    let sprite: HTMLCanvasElement | null = null;
    if (character === 'lion') {
      sprite = this.transparent3DGoalkeeperLionCanvas;
    } else if (character === 'champion') {
      sprite = this.transparent3DGoalkeeperChampionCanvas;
    } else if (character === 'cyber') {
      sprite = this.transparent3DGoalkeeperCyberCanvas;
    }

    // Graceful fallback to any loaded 3D canvas
    if (!sprite) {
      sprite =
        this.transparent3DGoalkeeperLionCanvas ||
        this.transparent3DGoalkeeperChampionCanvas ||
        this.transparent3DGoalkeeperCyberCanvas;
    }

    if (sprite) {
      if (playerId === 'P2' && character !== 'cyber') {
        // Player 2 distinct jersey tint if using same character
        ctx.filter = 'hue-rotate(190deg) saturate(1.2)';
      }

      // Athletic scale when diving or catching
      const diveScale = keeper.state === 'diving' ? 1.08 : 1.0;
      ctx.scale(diveScale, diveScale);

      ctx.drawImage(
        sprite,
        -keeperSize / 2,
        -keeperSize * 0.58,
        keeperSize,
        keeperSize
      );
      ctx.filter = 'none';
    } else {
      // 3D Vector Shaded Fallback
      this.drawVector3DGoalkeeperFallback(ctx, keeper, playerId);
    }

    // Goalkeeper State Badge (in Transparent Glass style)
    let badgeText =
      character === 'lion'
        ? '🦁 KIPER SINGA 3D'
        : character === 'cyber'
        ? '🤖 KIPER SIBER 3D'
        : '⚡ KIPER JUARA 3D';
    let badgeBorder = 'rgba(255, 255, 255, 0.4)';
    let badgeTextColor = '#E2E8F0';

    if (keeper.state === 'caught') {
      badgeText = '🧤 TERTANGKAP!';
      badgeBorder = 'rgba(239, 68, 68, 0.85)';
      badgeTextColor = '#FCA5A5';
    } else if (keeper.state === 'beaten') {
      badgeText = '⚡ TERKECOH!';
      badgeBorder = 'rgba(16, 185, 129, 0.85)';
      badgeTextColor = '#86EFAC';
    }

    // Transparent Glass Pill Badge
    const bw = 106;
    const bh = 22;
    const by = -keeperSize * 0.65;

    const glassGrad = ctx.createLinearGradient(0, by, 0, by + bh);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    glassGrad.addColorStop(1, 'rgba(15, 23, 42, 0.7)');
    ctx.fillStyle = glassGrad;
    roundRect(ctx, -bw / 2, by, bw, bh, 8);
    ctx.fill();

    ctx.strokeStyle = badgeBorder;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = badgeTextColor;
    ctx.font = '800 10px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, 0, by + bh / 2);

    ctx.restore();
  }

  // 3D Vector Shaded Fallback for Goalkeeper
  private drawVector3DGoalkeeperFallback(
    ctx: CanvasRenderingContext2D,
    keeper: GoalkeeperState,
    playerId: 'P1' | 'P2'
  ) {
    const jerseyColor = playerId === 'P1' ? '#FACC15' : '#38BDF8';
    const shortsColor = '#EF4444';
    const gloveColor = '#1E293B';

    // Athletic legs
    ctx.fillStyle = '#FED7AA';
    ctx.fillRect(-15, 10, 9, 16);
    ctx.fillRect(6, 10, 9, 16);

    // Socks & 3D Cleats
    ctx.fillStyle = '#2563EB';
    roundRect(ctx, -19, 26, 15, 8, 3);
    ctx.fill();
    roundRect(ctx, 4, 26, 15, 8, 3);
    ctx.fill();

    // Shorts
    ctx.fillStyle = shortsColor;
    roundRect(ctx, -18, 0, 36, 16, 4);
    ctx.fill();

    // 3D Jersey
    const jGrad = ctx.createLinearGradient(-20, -28, 20, 4);
    jGrad.addColorStop(0, '#FEF08A');
    jGrad.addColorStop(0.5, jerseyColor);
    jGrad.addColorStop(1, '#CA8A04');
    ctx.fillStyle = jGrad;
    roundRect(ctx, -20, -28, 40, 32, 8);
    ctx.fill();

    // Jersey #1
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 15px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', 0, -12);

    // Head
    ctx.fillStyle = '#FED7AA';
    ctx.beginPath();
    ctx.arc(0, -38, 14, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#B45309';
    ctx.beginPath();
    ctx.arc(0, -42, 14, Math.PI, Math.PI * 2);
    ctx.fill();

    // 3D Wide Padded Gloves
    ctx.save();
    ctx.translate(-18, -22);
    ctx.rotate(keeper.armAngleL);
    ctx.fillStyle = gloveColor;
    roundRect(ctx, -12, 16, 18, 18, 6);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(18, -22);
    ctx.rotate(keeper.armAngleR);
    ctx.fillStyle = gloveColor;
    roundRect(ctx, -6, 16, 18, 18, 6);
    ctx.fill();
    ctx.restore();
  }

  // Draw 3D Soccer Ball with Transparent Glass (Kaca Bening) Floating Answer Card
  private draw3DBallWithGlassCard(ctx: CanvasRenderingContext2D, ball: Ball) {
    if (ball.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = ball.opacity;
    ctx.translate(ball.x, ball.y);
    ctx.scale(ball.scale, ball.scale);

    // 1. Realistic 3D Floor Shadow when resting on ground
    if (ball.state === 'idle') {
      const shadowY = ball.radius * 0.94;
      const shadowGrad = ctx.createRadialGradient(0, shadowY, 4, 0, shadowY, ball.radius * 1.25);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
      shadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(0, shadowY, ball.radius * 1.05, ball.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Render 3D Soccer Ball Texture
    ctx.save();
    ctx.rotate(ball.rotation);

    if (this.transparent3DBallCanvas) {
      ctx.drawImage(
        this.transparent3DBallCanvas,
        -ball.radius,
        -ball.radius,
        ball.radius * 2,
        ball.radius * 2
      );
    } else if (this.soccerBallImage) {
      ctx.drawImage(
        this.soccerBallImage,
        -ball.radius,
        -ball.radius,
        ball.radius * 2,
        ball.radius * 2
      );
    }
    ctx.restore();

    // 3. Motion particles when kicked
    if (ball.state === 'kicked') {
      this.addTrailParticle(
        ball.x,
        ball.y,
        ball.radius * 0.45,
        ball.optionLetter === 'A' ? '#38BDF8' : '#F59E0B'
      );
    }

    // 4. Luminous Glass Pulsing Ring around Ball
    const pulse = Math.sin(Date.now() / 200) * 3;
    const ringColor = ball.optionLetter === 'A' ? 'rgba(56, 189, 248, 0.85)' : 'rgba(251, 191, 36, 0.85)';
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius + 6 + (ball.state === 'idle' ? pulse : 0), 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 5. Option Badge Pill [A] / [B] - Styled as 3D Glass Gem
    const badgeR = 17;
    const badgeY = -ball.radius - 12;

    const badgeGrad = ctx.createRadialGradient(-3, badgeY - 4, 2, 0, badgeY, badgeR);
    if (ball.optionLetter === 'A') {
      badgeGrad.addColorStop(0, '#7DD3FC');
      badgeGrad.addColorStop(0.5, '#0284C7');
      badgeGrad.addColorStop(1, '#0369A1');
    } else {
      badgeGrad.addColorStop(0, '#FDE047');
      badgeGrad.addColorStop(0.5, '#D97706');
      badgeGrad.addColorStop(1, '#B45309');
    }

    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    ctx.arc(0, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fill();

    // Specular glass ring on badge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ball.optionLetter, 0, badgeY + 1);

    // 6. Floating Glassmorphism Transparent Answer Card (Bening Kaca Transparan)
    const textW = Math.max(136, ball.label.length * 9.5 + 28);
    const textH = 34;
    const textY = ball.radius + 14;

    // Liquid Glass Background (Translucent with light refraction)
    const glassGrad = ctx.createLinearGradient(0, textY, 0, textY + textH);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    glassGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.10)');
    glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.18)');

    ctx.fillStyle = glassGrad;
    roundRect(ctx, -textW / 2, textY, textW, textH, 10);
    ctx.fill();

    // Crystalline Specular Border
    const borderGrad = ctx.createLinearGradient(-textW / 2, textY, textW / 2, textY + textH);
    borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    borderGrad.addColorStop(
      0.5,
      ball.optionLetter === 'A' ? 'rgba(56, 189, 248, 0.7)' : 'rgba(251, 191, 36, 0.7)'
    );
    borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.35)');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Top subtle reflection streak (Glass shine)
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, -textW / 2 + 1, textY + 1, textW - 2, textH * 0.45, 9);
    ctx.clip();
    const shineGrad = ctx.createLinearGradient(0, textY, 0, textY + textH * 0.45);
    shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = shineGrad;
    ctx.fill();
    ctx.restore();

    // High contrast crisp text inside glass card with subtle shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ball.label, 0, textY + textH / 2);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private addTrailParticle(x: number, y: number, radius: number, color: string) {
    this.particleTrails.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      radius,
      color,
      alpha: 0.65,
    });
    if (this.particleTrails.length > 35) {
      this.particleTrails.shift();
    }
  }

  private drawBallTrails(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (let i = this.particleTrails.length - 1; i >= 0; i--) {
      const p = this.particleTrails[i];
      p.alpha -= 0.035;
      p.radius *= 0.96;
      if (p.alpha <= 0) {
        this.particleTrails.splice(i, 1);
        continue;
      }
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw tracked feet with glowing halos
  private drawFootTrackers(
    ctx: CanvasRenderingContext2D,
    footPoints: FootPoint[],
    players: PlayerRenderGroup[]
  ) {
    if (footPoints.length === 0) return;

    footPoints.forEach((foot) => {
      if (foot.visibility < 0.25) return;

      const isLeft = foot.index === 27 || foot.index === 31;
      const isToe = foot.index === 31 || foot.index === 32;
      const themeColor = isLeft ? '#10B981' : '#6366F1';

      ctx.save();
      ctx.translate(foot.x, foot.y);

      const pulse = Math.sin(Date.now() / 150 + foot.index) * 3;
      const radius = (isToe ? 22 : 18) + pulse;

      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 15;

      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      // Glass foot badge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      const labelText = isToe
        ? isLeft
          ? '🦶 Kaki Kiri'
          : '🦶 Kaki Kanan'
        : isLeft
          ? 'Ankle Kiri'
          : 'Ankle Kanan';
      const pillW = 86;
      roundRect(ctx, -pillW / 2, 14, pillW, 20, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 10px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, 0, 24);

      ctx.restore();
    });

    // Impact sparks for kicking
    players.forEach((p) => {
      if (p.activeKickFoot) {
        ctx.save();
        ctx.translate(p.activeKickFoot.x, p.activeKickFoot.y);
        ctx.fillStyle = '#FACC15';
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 20;

        for (let i = 0; i < 8; i++) {
          const ang = (i * Math.PI * 2) / 8;
          const dist = 30;
          ctx.beginPath();
          ctx.arc(Math.cos(ang) * dist, Math.sin(ang) * dist, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    });
  }

  // Skeleton Overlay
  private drawSkeletonOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    landmarks: { x: number; y: number; visibility: number }[],
    mode: GameMode
  ) {
    const connections: [number, number][] = [
      [11, 12],
      [11, 23],
      [12, 24],
      [23, 24],
      [23, 25],
      [25, 27],
      [27, 31],
      [24, 26],
      [26, 28],
      [28, 32],
      [11, 13],
      [13, 15],
      [12, 14],
      [14, 16],
    ];

    ctx.save();
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    connections.forEach(([i1, i2]) => {
      const p1 = landmarks[i1];
      const p2 = landmarks[i2];
      if (p1 && p2 && p1.visibility > 0.4 && p2.visibility > 0.4) {
        const x1 = (1 - p1.x) * width;
        const y1 = p1.y * height;
        const x2 = (1 - p2.x) * width;
        const y2 = p2.y * height;

        const isLeftHalf = x1 < width / 2;
        ctx.strokeStyle =
          mode === '2P'
            ? isLeftHalf
              ? 'rgba(56, 189, 248, 0.7)'
              : 'rgba(251, 146, 60, 0.7)'
            : 'rgba(56, 189, 248, 0.6)';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  // GOAL Burst with Glass Backdrop
  private drawGoalBurst(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    progress: number,
    message = 'GOAL!',
    streak = 1
  ) {
    ctx.save();
    const scale = 1 + Math.sin(progress * Math.PI) * 0.35;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Frosted glass celebratory backing
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    roundRect(ctx, -140, -45, 280, 90, 20);
    ctx.fill();
    ctx.stroke();

    ctx.font = '900 44px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#0F172A';
    ctx.fillText('⚽ ' + message + ' ⚽', 2, 2);

    const textGrad = ctx.createLinearGradient(0, -25, 0, 25);
    textGrad.addColorStop(0, '#FEF08A');
    textGrad.addColorStop(0.5, '#F59E0B');
    textGrad.addColorStop(1, '#DC2626');
    ctx.fillStyle = textGrad;
    ctx.fillText('⚽ ' + message + ' ⚽', 0, 0);

    if (streak > 1) {
      ctx.font = '800 15px Outfit, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#10B981';
      ctx.shadowBlur = 8;
      ctx.fillText(`🔥 STREAK x${streak}!`, 0, 26);
    }

    ctx.restore();
  }

  // Miss / Caught Banner with Glass Styling
  private drawMissBanner(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    progress: number,
    message = 'DITANGKAP KIPER!'
  ) {
    ctx.save();
    const scale = 1 + Math.sin(progress * Math.PI) * 0.2;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Glass banner
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    roundRect(ctx, -140, -32, 280, 64, 16);
    ctx.fill();
    ctx.stroke();

    ctx.font = '900 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 10;
    ctx.fillText('🧤 ' + message, 0, 0);

    ctx.restore();
  }
}

function drawPentagon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  angleOffset = 0
) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = angleOffset + (i * Math.PI * 2) / 5 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
