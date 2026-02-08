import CodeDialog from '@/app/components/shared/CodeDialog'
import CodePreview from '@/app/components/shared/CodePreview'
import React from 'react'
import ClickPopover from '../ClickPopover'
const ClickPopoverCode = () => {
    return (
        <>
            <CodePreview
                component={<ClickPopover />}
                filePath="src/app/components/ui-components/popover/ClickPopover.jsx"
                title="ClickPopover List"
            >

            </CodePreview>
        </>
    )
}

export default ClickPopoverCode
