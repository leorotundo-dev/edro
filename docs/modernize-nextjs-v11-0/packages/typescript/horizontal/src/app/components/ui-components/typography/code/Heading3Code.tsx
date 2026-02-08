import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import Heading3 from '../Heading3';

const Heading3Code = () => {
    return (
        <CodePreview
            component={<Heading3 />}
            filePath="src/app/components/ui-components/typography/Heading3.tsx"
            title="Heading3"
        />
    );
};

export default Heading3Code;