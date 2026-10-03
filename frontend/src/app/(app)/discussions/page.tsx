import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Feed } from '../_components/Feed';
import { LoadingState } from '@/components/shared/LoadingState';

export const metadata: Metadata = {
  title: 'Thảo luận',
  description: 'Trao đổi và chia sẻ kinh nghiệm học tập.',
};

export default function DiscussionsPage() {
  return (
    <Suspense fallback={<LoadingState variant="feed" count={8} />}>
      <Feed
        fixedPostType="discussion"
        title="Thảo luận"
        description="Chia sẻ kiến thức và trao đổi ý kiến."
      />
    </Suspense>
  );
}
