import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import Heading6 from '../Heading6';

const Heading6Code = () => {
    return (
        <CodePreview
            component={<Heading6 />}
            filePath="src/app/components/ui-components/typography/Heading6.jsx"
            title="Heading6"
        />
    );
};

export default Heading6Code;