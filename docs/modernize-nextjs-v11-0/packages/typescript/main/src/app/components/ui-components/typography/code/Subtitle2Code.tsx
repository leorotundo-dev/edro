import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import Subtitle2 from '../Subtitle2';

const Subtitle2Code = () => {
    return (
        <CodePreview
            component={<Subtitle2 />}
            filePath="src/app/components/ui-components/typography/Subtitle2.tsx"
            title="Subtitle2"
        />
    );
};

export default Subtitle2Code;