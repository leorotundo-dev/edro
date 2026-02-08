import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import Body2 from '../Body2';

const Body2Code = () => {
  return (
    <CodePreview
      component={<Body2 />}
      filePath="src/app/components/ui-components/typography/Body2.tsx"
      title="Body2"
    />
  );
};

export default Body2Code;
