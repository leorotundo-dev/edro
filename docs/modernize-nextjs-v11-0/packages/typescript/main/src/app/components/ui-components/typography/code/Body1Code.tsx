import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import Body1 from '../Body1';

const Body1Code = () => {
  return (
    <CodePreview
      component={<Body1 />}
      filePath="src/app/components/ui-components/typography/Body1.tsx"
      title="Body1"
    />
  );
};

export default Body1Code;
