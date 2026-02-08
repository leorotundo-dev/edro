import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import TextSecondary from '../TextSecondary';

const TextSecondaryCode = () => {
  return (
    <CodePreview
      component={<TextSecondary />}
      filePath="src/app/components/ui-components/typography/TextSecondary.jsx"
      title="TextSecondary"
    />
  );
};

export default TextSecondaryCode;
