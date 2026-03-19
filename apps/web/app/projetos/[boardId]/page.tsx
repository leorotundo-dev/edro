import { Suspense } from 'react';
import ProjectBoardClient from './ProjectBoardClient';

export const metadata = { title: 'Kanban | Edro' };

export default async function Page({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  return (
    <Suspense>
      <ProjectBoardClient boardId={boardId} />
    </Suspense>
  );
}
