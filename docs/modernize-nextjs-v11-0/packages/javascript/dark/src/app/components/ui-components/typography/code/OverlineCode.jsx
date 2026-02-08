import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import Overline from '../Overline';

const OverlineCode = () => {
  return (
    <CodePreview
      component={<Overline />}
      filePath="src/app/components/ui-components/typography/Overline.jsx"
      title="Overline"
    />
  );
};

export default OverlineCode;
