import CodePreview from '@/app/components/shared/CodePreview';
import React from 'react';
import TextPrimary from '../TextPrimary';

const TextPrimaryCode = () => {
    return (
        <CodePreview
            component={<TextPrimary />}
            filePath="src/app/components/ui-components/typography/TextPrimary.jsx"
            title="TextPrimary"
        />
    );
};

export default TextPrimaryCode;