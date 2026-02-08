import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import TextSuccess from '../TextSuccess';

const TextSuccessCode = () => {
  return (
    <CodePreview
      component={<TextSuccess />}
      filePath="src/app/components/ui-components/typography/TextSuccess.jsx"
      title="TextSuccess"
    />
  );
};

export default TextSuccessCode;
