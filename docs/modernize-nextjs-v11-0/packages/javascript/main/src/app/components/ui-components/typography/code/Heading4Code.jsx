import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import Heading4 from '../Heading4';

const Heading4Code = () => {
    return (
        <CodePreview
            component={<Heading4 />}
            filePath="src/app/components/ui-components/typography/Heading4.jsx"
            title="Heading4"
        />
    );
};

export default Heading4Code;