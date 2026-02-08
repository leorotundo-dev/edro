import React from 'react'


import ApiKeys from '@/app/components/pages/api-keys/ApiKeys'
import Breadcrumb from '../../layout/shared/breadcrumb/Breadcrumb'
import AppCard from "@/app/components/shared/AppCard";



const BCrumb = [
    {
        to: '/',
        title: 'Dashboard',
    },
    {

        title: 'API Keys',
    },
]

function APIKey() {
    return (
        <>
            <Breadcrumb title='API Keys' items={BCrumb} />
            <AppCard>
                <ApiKeys />
            </AppCard>
        </>
    )
}

export default APIKey