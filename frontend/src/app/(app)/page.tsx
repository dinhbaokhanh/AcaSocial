import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Feed } from './_components/Feed';
import { LoadingState } from '@/components/shared/LoadingState';
import { SITE_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: `Bảng tin — ${SITE_NAME}`,
  description: 'Câu hỏi và thảo luận trong các phòng học tập.',
};

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingState variant="feed" count={8} />}>
      <Feed
        title="Bảng tin"
        description="Theo dõi bài đăng trong phòng bạn chọn."
      />
    </Suspense>
  );
}
