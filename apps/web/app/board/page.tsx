import { Suspense } from 'react';
import BoardClient from './BoardClient';

export default function Page() {
  return (
    <Suspense>
      <BoardClient />
    </Suspense>
  );
}
