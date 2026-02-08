import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import Heading5 from '../Heading5';

const Heading5Code = () => {
    return (
        <CodePreview
            component={<Heading5 />}
            filePath="src/app/components/ui-components/typography/Heading5.jsx"
            title="Heading5"
        />
    );
};

export default Heading5Code;