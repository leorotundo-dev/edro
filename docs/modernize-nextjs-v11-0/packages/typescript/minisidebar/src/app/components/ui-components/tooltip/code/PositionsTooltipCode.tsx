import CodePreview from '@/app/components/shared/CodePreview'
import React from 'react'
import PositionsTooltip from '../TooltipPosition'
const PositionsTooltipCode = () => {
    return (
        <>
            <CodePreview
                component={<PositionsTooltip />}
                filePath="src/app/components/ui-components/tooltip/TooltipPosition.tsx"
                title="PositionsTooltip"
            ></CodePreview>
        </>
    )
}

export default PositionsTooltipCode
