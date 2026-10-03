import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Feed } from '../_components/Feed';
import { LoadingState } from '@/components/shared/LoadingState';

export const metadata: Metadata = {
  title: 'Câu hỏi',
  description: 'Tìm câu hỏi và trao đổi cách giải cùng cộng đồng.',
};

export default function QuestionsPage() {
  return (
    <Suspense fallback={<LoadingState variant="feed" count={8} />}>
      <Feed
        fixedPostType="question"
        title="Câu hỏi"
        description="Đặt câu hỏi hoặc chia sẻ cách giải."
      />
    </Suspense>
  );
}
