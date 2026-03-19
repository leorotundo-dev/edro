import { Suspense } from 'react';
import ProjectBoardClient from './ProjectBoardClient';

export const metadata = { title: 'Kanban | Edro' };

export default function Page({ params }: { params: { boardId: string } }) {
  return (
    <Suspense>
      <ProjectBoardClient boardId={params.boardId} />
    </Suspense>
  );
}
