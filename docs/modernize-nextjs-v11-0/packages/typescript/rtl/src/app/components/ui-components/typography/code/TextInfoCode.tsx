import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import TextInfo from '../TextInfo';

const TextInfoCode = () => {
  return (
    <CodePreview
      component={<TextInfo />}
      filePath="src/app/components/ui-components/typography/TextInfo.tsx"
      title="TextInfo"
    />
  );
};

export default TextInfoCode;
