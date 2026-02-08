import React from 'react'


import Breadcrumb from '@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/app/components/container/PageContainer';
import { BlogProvider } from '@/app/context/BlogContext';
import ManageBlogTable from '@/app/components/apps/blog/blogtable/ManageBlogTable';

const BCrumb = [
    {
        to: "/",
        title: "Dashboard",
    },
    {
        to: '/apps/blog/post',
        title: "Blog",
    },
    {
        title: "Manage Blog",
    },
];


function ManageBlogPage() {
    return (
        <BlogProvider>
            <PageContainer title="Blog" description="this is Blog">
                <Breadcrumb title="Blog" items={BCrumb} />
                <ManageBlogTable />
            </PageContainer>
        </BlogProvider>
    )
}

export default ManageBlogPage