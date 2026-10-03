import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Feed } from '../_components/Feed';
import { LoadingState } from '@/components/shared/LoadingState';

export const metadata: Metadata = {
  title: 'Questions',
  description: 'Browse all academic questions and find answers from the community.',
};

export default function QuestionsPage() {
  return (
    <Suspense fallback={<LoadingState variant="feed" count={8} />}>
      <Feed
        fixedPostType="question"
        title="Questions"
        description="Academic questions from the community. Find answers or share your expertise."
      />
    </Suspense>
  );
}
