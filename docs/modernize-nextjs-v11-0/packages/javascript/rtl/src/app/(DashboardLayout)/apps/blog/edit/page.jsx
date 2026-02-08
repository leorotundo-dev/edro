import React from 'react'


import Breadcrumb from '@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/app/components/container/PageContainer';
import { BlogProvider } from '@/app/context/BlogContext';
import { Button, Grid, Stack } from "@mui/material";
import GeneralDetail from '@/app/components/apps/blog/edit/GeneralDetail';
import BlankCard from '@/app/components/shared/BlankCard';

import Status from '@/app/components/apps/blog/edit/Status';

import Media from '@/app/components/apps/blog/edit/Media';
import CategoryTags from '@/app/components/apps/blog/edit/CategoryTags';
import PostDate from '@/app/components/apps/blog/edit/PostDate';


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
        title: "Edit",
    },
];


function BlogEditPage() {
    return (
        <BlogProvider>
            <PageContainer title="Blog" description="this is Blog">
                <Breadcrumb title="Blog" items={BCrumb} />
                <Grid container spacing={3}>
                    <Grid
                        size={{
                            lg: 8,
                            md: 6,
                            xs: 12
                        }}
                    >
                        <Stack spacing={3}>
                            <BlankCard>
                                <GeneralDetail />
                            </BlankCard>

                            <BlankCard>
                                <Media />
                            </BlankCard>

                        </Stack>
                    </Grid>

                    <Grid
                        size={{
                            lg: 4,
                            md: 6,
                            xs: 12

                        }}
                    >
                        <Stack spacing={3}>


                            <BlankCard>
                                <Status />
                            </BlankCard>
                            <BlankCard>
                                <CategoryTags />
                            </BlankCard>


                            <BlankCard>
                                <PostDate />
                            </BlankCard>

                        </Stack>
                    </Grid>
                </Grid>

                <Stack direction="row" spacing={2} mt={3}>
                    <Button variant="contained" color="primary" >
                        Save Changes
                    </Button>
                    <Button variant="outlined" color="error">
                        Cancel
                    </Button>
                </Stack>
            </PageContainer>
        </BlogProvider>
    )
}

export default BlogEditPage