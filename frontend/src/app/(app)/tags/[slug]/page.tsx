'use client';

import { Suspense, use } from 'react';
import { Feed } from '../../_components/Feed';
import { LoadingState } from '@/components/shared/LoadingState';

interface TagDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default function TagDetailPage({ params }: TagDetailPageProps) {
  const { slug } = use(params);
  const decodedSlug = decodeURIComponent(slug);

  return (
    <Suspense fallback={<LoadingState label="Đang tải bài đăng theo thẻ…" />}>
      <Feed
        fixedTag={decodedSlug}
        title={`Posts tagged #${decodedSlug}`}
        description={`Explore questions, answers, and discussions categorized under #${decodedSlug}.`}
      />
    </Suspense>
  );
}
