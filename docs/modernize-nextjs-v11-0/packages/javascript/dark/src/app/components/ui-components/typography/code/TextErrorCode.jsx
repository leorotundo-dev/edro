import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import TextError from '../TextError';

const TextErrorCode = () => {
  return (
    <CodePreview
      component={<TextError />}
      filePath="src/app/components/ui-components/typography/TextError.jsx"
      title="TextError"
    />
  );
};

export default TextErrorCode;
