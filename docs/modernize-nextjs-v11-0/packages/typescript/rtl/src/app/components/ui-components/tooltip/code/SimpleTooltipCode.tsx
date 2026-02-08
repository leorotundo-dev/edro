import CodePreview from '@/app/components/shared/CodePreview'
import React from 'react'
import SimpleTooltip from '../TooltipSimple'
const SimpleTooltipCode = () => {
    return (
        <>
            <CodePreview
                component={<SimpleTooltip />}
                filePath="src/app/components/ui-components/tooltip/TooltipSimple.tsx"
                title="SimpleTooltip"
            ></CodePreview>
        </>
    )
}

export default SimpleTooltipCode
