'use client'
import React, { useContext, useState, useEffect } from 'react'
import Box from "@mui/material/Box";
import { TextField, Typography } from "@mui/material";
import { Grid } from "@mui/material";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import dynamic from "next/dynamic";
import { BlogContext } from '@/app/context/BlogContext';


const TiptapEditor = dynamic(
    () => import("@/app/components/forms/form-tiptap/TiptapEditor"),
    {
        ssr: false,
    }
);

function GeneralDetail() {
    const { posts } = useContext(BlogContext);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (posts.length > 0) {
            const firstPost = posts[0];
            setTitle(firstPost.title);
            setContent(firstPost.content ?? '');
        }
    }, [posts]);


    return (
        <Box p={3}>
            <Typography variant="h5">Blog Details</Typography>
            <Grid container mt={3}>
                {/* 1 */}
                <Grid display="flex" alignItems="center" size={12}>
                    <CustomFormLabel htmlFor="b_name" sx={{ mt: 0 }}>
                        Blog Title

                    </CustomFormLabel>
                </Grid>
                <Grid size={12}>
                    <CustomTextField
                        id="b_name"
                        placeholder="Blog Title"
                        fullWidth
                        value={title}
                        onChange={(e: any) => setTitle(e.target.value)}
                    />
                    <Typography variant="body2">
                        A product name is required and recommended to be unique.
                    </Typography>
                </Grid>
                <Grid display="flex" alignItems="center" size={12}>
                    <CustomFormLabel htmlFor="desc">Content</CustomFormLabel>
                </Grid>
                <Grid size={12}>
                    <TextField
                        placeholder="Start typing..."
                        multiline
                        rows={5}
                        fullWidth
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        variant="outlined"
                        slotProps={{
                            input: {
                                sx: {
                                    padding: 0
                                }
                            },
                        }}
                    />
                    <Typography variant="body2">
                        Set a description to the product for better visibility.
                    </Typography>
                </Grid>
            </Grid>
        </Box>
    )
}

export default GeneralDetail