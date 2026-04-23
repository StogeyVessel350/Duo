import React, { useEffect, useRef } from 'react';
import Svg, { G, Ellipse, Line, Path, Circle } from 'react-native-svg';
import { Animated, Easing } from 'react-native';
import { Clip, Pose, CLIPS } from './clips';
import { TOKENS } from '@/theme';

interface Props {
  clipId: string;
  width?: number;
  height?: number;
  playing?: boolean;
  tint?: string;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function sampleClip(clip: Clip, progress: number): Pose {
  const kfs = clip.keyframes;
  if (progress <= kfs[0].t) return kfs[0].pose;
  if (progress >= kfs[kfs.length - 1].t) return kfs[kfs.length - 1].pose;

  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (progress >= a.t && progress <= b.t) {
      const local = (progress - a.t) / (b.t - a.t);
      const t = easeInOut(local);
      const lerped: Pose = {} as Pose;
      for (const key of Object.keys(a.pose) as (keyof Pose)[]) {
        lerped[key] = [lerp(a.pose[key][0], b.pose[key][0], t), lerp(a.pose[key][1], b.pose[key][1], t)];
      }
      return lerped;
    }
  }
  return kfs[0].pose;
}

const FAR_DIM = 0.55;
const NEAR_OPACITY = 1;
const FAR_OPACITY = 0.45;

function px(norm: number, dim: number) { return norm * dim; }

interface RenderedFigureProps {
  pose: Pose;
  clip: Clip;
  w: number;
  h: number;
  tint: string;
}

function RenderedFigure({ pose, clip, w, h, tint }: RenderedFigureProps) {
  const x = (n: number) => px(n, w);
  const y = (n: number) => px(n, h);

  const limbW = w * 0.04;
  const jointR = w * 0.018;
  const headRX = w * 0.045;
  const headRY = w * 0.055;

  function segment(
    a: [number, number],
    b: [number, number],
    opacity: number,
    stroke?: string,
  ) {
    return (
      <Line
        x1={x(a[0])} y1={y(a[1])}
        x2={x(b[0])} y2={y(b[1])}
        stroke={stroke ?? tint}
        strokeWidth={limbW}
        strokeLinecap="round"
        opacity={opacity}
      />
    );
  }

  const p = pose;

  const barbellY = y(Math.min(p.lWrist[1], p.rWrist[1]));
  const cableAX = x(clip.id === 'cableRow' ? 0.85 : 0.85);

  return (
    <G>
      {/* Far-side limbs (behind) */}
      {segment(p.rHip, p.rKnee, FAR_OPACITY)}
      {segment(p.rKnee, p.rAnkle, FAR_OPACITY)}
      {segment(p.rShoulder, p.rElbow, FAR_OPACITY)}
      {segment(p.rElbow, p.rWrist, FAR_OPACITY)}

      {/* Torso */}
      {segment(p.hip, p.spine, NEAR_OPACITY)}
      {segment(p.spine, p.chest, NEAR_OPACITY)}
      {segment(p.chest, p.neck, NEAR_OPACITY)}
      {segment(p.lShoulder, p.rShoulder, NEAR_OPACITY)}
      {segment(p.lHip, p.rHip, NEAR_OPACITY)}

      {/* Near-side limbs */}
      {segment(p.lHip, p.lKnee, NEAR_OPACITY)}
      {segment(p.lKnee, p.lAnkle, NEAR_OPACITY)}
      {segment(p.lShoulder, p.lElbow, NEAR_OPACITY)}
      {segment(p.lElbow, p.lWrist, NEAR_OPACITY)}

      {/* Head */}
      <Ellipse
        cx={x(p.head[0])}
        cy={y(p.head[1])}
        rx={headRX}
        ry={headRY}
        fill={tint}
        opacity={0.9}
      />

      {/* Joint dots */}
      {[p.lKnee, p.rKnee, p.lElbow, p.rElbow].map(([jx, jy], i) => (
        <Circle
          key={i}
          cx={x(jx)}
          cy={y(jy)}
          r={jointR}
          fill={TOKENS.color.bg.elevated}
          stroke={tint}
          strokeWidth={1.5}
        />
      ))}

      {/* Equipment */}
      {clip.equipment === 'barbell' && (
        <>
          <Line
            x1={x(p.lWrist[0]) - w * 0.18}
            y1={barbellY}
            x2={x(p.rWrist[0]) + w * 0.18}
            y2={barbellY}
            stroke={TOKENS.color.fg.secondary}
            strokeWidth={limbW * 0.6}
            strokeLinecap="round"
          />
          {/* Plates */}
          {[-1, 1].map(side => (
            <React.Fragment key={side}>
              <Line
                x1={x(p.lWrist[0]) + side * (w * 0.13)}
                y1={barbellY - h * 0.03}
                x2={x(p.lWrist[0]) + side * (w * 0.13)}
                y2={barbellY + h * 0.03}
                stroke={TOKENS.color.fg.tertiary}
                strokeWidth={limbW * 1.5}
                strokeLinecap="round"
              />
            </React.Fragment>
          ))}
        </>
      )}
      {clip.equipment === 'dumbbell' && (
        <>
          {[p.lWrist, p.rWrist].map(([wx, wy], i) => (
            <G key={i}>
              <Line
                x1={x(wx) - w * 0.04}
                y1={y(wy)}
                x2={x(wx) + w * 0.04}
                y2={y(wy)}
                stroke={TOKENS.color.fg.secondary}
                strokeWidth={limbW * 0.7}
                strokeLinecap="round"
              />
              <Circle cx={x(wx) - w * 0.045} cy={y(wy)} r={w * 0.022} fill={TOKENS.color.fg.tertiary} />
              <Circle cx={x(wx) + w * 0.045} cy={y(wy)} r={w * 0.022} fill={TOKENS.color.fg.tertiary} />
            </G>
          ))}
        </>
      )}
      {clip.equipment === 'cable' && (
        <>
          <Line
            x1={x(p.lWrist[0])}
            y1={y(p.lWrist[1])}
            x2={cableAX}
            y2={y(0.55)}
            stroke={TOKENS.color.fg.tertiary}
            strokeWidth={1.5}
            strokeDasharray="4,3"
          />
        </>
      )}
    </G>
  );
}

export function AnimatedFigure({ clipId, width = 80, height = 106, playing = true, tint = TOKENS.color.fg.secondary }: Props) {
  const clip = CLIPS[clipId] ?? CLIPS['backSquat'];
  const progress = useRef(new Animated.Value(0)).current;
  const [pose, setPose] = React.useState<Pose>(clip.keyframes[0].pose);

  useEffect(() => {
    if (!playing) return;

    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: clip.durationMs,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );

    const id = progress.addListener(({ value }) => {
      setPose(sampleClip(clip, value));
    });

    loop.start();

    return () => {
      loop.stop();
      progress.removeListener(id);
    };
  }, [clipId, playing]);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <RenderedFigure pose={pose} clip={clip} w={width} h={height} tint={tint} />
    </Svg>
  );
}
