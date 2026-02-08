"use client";
import React, { useContext, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { Autocomplete, Button, Chip, Grid, Typography } from "@mui/material";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { IconPlus } from "@tabler/icons-react";
import { BlogContext } from "@/app/context/BlogContext";
import { BlogPostType } from "@/app/(DashboardLayout)/types/apps/blog";



const catOptions = [
    'Technology',
    'Lifestyle',
    'Travel',
    'Food',
    'Business',
    'Social',
];

const tagOptions = ['Trending', 'Tips', 'News', 'Guide', 'Popular'];
function CategoryTags() {

    const { posts } = useContext(BlogContext);

    const [categories, setCategories] = useState<string[]>([]);
    const [tags, setTags] = useState<string[]>([]);

    useEffect(() => {
        if (posts.length > 0) {
            const firstPost = posts[0];
            if (firstPost.category) {
                setCategories(
                    Array.isArray(firstPost.category)
                        ? firstPost.category
                        : [firstPost.category]
                );
            }
            setTags(["Trending"])
        }
    }, [posts]);




    return (
        (<Box p={3}>
            <Typography variant="h5">Blog Category</Typography>
            <Grid container mt={3}>
                {/* 1 */}
                <Grid display="flex" alignItems="center" size={12}>
                    <CustomFormLabel htmlFor="p_cat" sx={{ mt: 0 }}>
                        Categories
                    </CustomFormLabel>
                </Grid>
                <Grid size={12}>
                    <Autocomplete
                        multiple
                        freeSolo
                        options={catOptions}
                        value={categories}
                        onChange={(event, newValue) => setCategories(newValue)}
                        renderValue={(value, getTagProps) =>
                            value.map((option, index) => (
                                <Chip

                                    label={option}
                                    {...getTagProps({ index })}
                                    onDelete={() =>
                                        setCategories(categories.filter((cat) => cat !== option))
                                    }
                                    key={index}
                                />
                            ))
                        }
                        renderInput={(params) => (
                            <CustomTextField {...params} placeholder="Add category" />
                        )}
                    />
                    {/* <CustomTextField id="p_cat" fullWidth /> */}
                    <Typography variant="body2" mb={2}>
                        Add blog to a category.
                    </Typography>
                </Grid>
                <Grid size={12}>
                    <Button variant="text" startIcon={<IconPlus size={18} />}>
                        Create New Category
                    </Button>
                </Grid>
                {/* 1 */}
                <Grid display="flex" alignItems="center" size={12}>
                    <CustomFormLabel htmlFor="p_tag">Tags</CustomFormLabel>
                </Grid>
                <Grid size={12}>
                    {/* <Autocomplete
                        multiple
                        fullWidth
                        id="new-tags"
                        options={new_tags}
                        getOptionLabel={(option) => option.label}
                        filterSelectedOptions
                        renderInput={(params) => (
                            <CustomTextField {...params} placeholder="Tags" />
                        )}
                    /> */}
                    <Autocomplete
                        multiple
                        id="new-tags"
                        options={tagOptions}
                        value={tags}
                        onChange={(event, newValue) => setTags(newValue)}
                        renderValue={(value, getTagProps) =>
                            value.map((option, index) => (
                                <Chip

                                    label={option}
                                    {...getTagProps({ index })}
                                    onDelete={() =>
                                        setTags(tags.filter((tag) => tag !== option))
                                    }
                                    key={index}
                                />
                            ))
                        }
                        renderInput={(params) => (
                            <CustomTextField {...params} placeholder="Tags" />
                        )}
                    />
                    {/* <CustomTextField id="p_tag" fullWidth /> */}
                    <Typography variant="body2" mb={2}>
                        Add tags for blog.
                    </Typography>
                </Grid>
            </Grid>
        </Box>)
    )
}

export default CategoryTags


