import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import Heading1 from '../Heading1';

const Heading1Code = () => {
    return (
        <CodePreview
            component={<Heading1 />}
            filePath="src/app/components/ui-components/typography/Heading1.tsx"
            title="Heading1"
        />
    );
};

export default Heading1Code;