import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import Caption from '../Caption';

const CaptionCode = () => {
  return (
    <CodePreview
      component={<Caption />}
      filePath="src/app/components/ui-components/typography/Caption.tsx"
      title="Caption"
    />
  );
};

export default CaptionCode;
