import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import Subtitle1 from '../Subtitle1';

const Subtitle1Code = () => {
    return (
        <CodePreview
            component={<Subtitle1 />}
            filePath="src/app/components/ui-components/typography/Subtitle1.jsx"
            title="Subtitle1"
        />
    );
};

export default Subtitle1Code;