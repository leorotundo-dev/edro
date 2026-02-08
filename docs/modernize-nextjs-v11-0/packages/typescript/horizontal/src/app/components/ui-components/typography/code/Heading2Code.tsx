import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import Heading2 from '../Heading2';

const Heading2Code = () => {
    return (
        <CodePreview
            component={<Heading2 />}
            filePath="src/app/components/ui-components/typography/Heading2.tsx"
            title="Heading2"
        />
    );
};

export default Heading2Code;