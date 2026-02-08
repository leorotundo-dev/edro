import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import TextWarning from '../TextWarning';

const TextWarningCode = () => {
  return (
    <CodePreview
      component={<TextWarning />}
      filePath="src/app/components/ui-components/typography/TextWarning.jsx"
      title="TextWarning"
    />
  );
};

export default TextWarningCode;
