'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

type SkeletonCardProps = {
  lines?: number;
  height?: number;
  hasTitle?: boolean;
};

export default function SkeletonCard({ lines = 3, height, hasTitle = true }: SkeletonCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          {hasTitle && <Skeleton variant="text" width="60%" height={28} />}
          {height ? (
            <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 1 }} />
          ) : (
            Array.from({ length: lines }).map((_, i) => (
              <Skeleton key={i} variant="text" width={i === lines - 1 ? '40%' : '100%'} />
            ))
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
