'use client';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

export type PipelineEdgeData = {
  status: 'locked' | 'active' | 'done';
  accentColor?: string;
};

export default function PipelineEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data,
}: EdgeProps) {
  const edgeData = data as PipelineEdgeData;
  const status = edgeData?.status ?? 'locked';

  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    borderRadius: 8,
  });

  const defaultColor =
    status === 'done'   ? '#13DEB9' :
    status === 'active' ? '#E85219' :
    '#333333';
  const color = edgeData?.accentColor && status !== 'locked' ? edgeData.accentColor : defaultColor;

  const animated = status === 'active';

  return (
    <>
      {/* Background/shadow path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: animated ? 2 : 1.5,
          strokeDasharray: status === 'locked' ? '5 4' : undefined,
          opacity: status === 'locked' ? 0.35 : 1,
          transition: 'stroke 0.4s, opacity 0.4s',
          filter: status === 'done' ? `drop-shadow(0 0 4px ${color}88)` : undefined,
        }}
      />
      {/* Animated dot on active edges */}
      {animated && (
        <circle r={4} fill={color}>
          <animateMotion
            dur="1.6s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
    </>
  );
}
