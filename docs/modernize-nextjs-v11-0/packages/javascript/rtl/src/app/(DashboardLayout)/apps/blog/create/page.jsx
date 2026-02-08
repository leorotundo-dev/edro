import React from 'react'

import Breadcrumb from '@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/app/components/container/PageContainer';

import { Button, Grid, Stack } from "@mui/material";
import BlankCard from '@/app/components/shared/BlankCard';

import Status from '@/app/components/apps/blog/create/Status';
import GeneralDetail from '@/app/components/apps/blog/create/GeneralDetail';
import Media from '@/app/components/apps/blog/create/Media';
import CategoryTags from '@/app/components/apps/blog/create/CategoryTags';
import PostDate from '@/app/components/apps/blog/create/PostDate';



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
        title: "Create",
    },
];



function BlogCreatePage() {
    return (

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

    )
}

export default BlogCreatePage