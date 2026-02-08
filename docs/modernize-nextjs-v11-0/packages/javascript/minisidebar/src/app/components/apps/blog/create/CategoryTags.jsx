"use client";
import React from "react";
import Box from "@mui/material/Box";
import { Autocomplete, Button, Grid, Typography } from "@mui/material";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { IconPlus } from "@tabler/icons-react";



const new_category = [
    { label: "Technology" },
    { label: "Lifestyle" },
    { label: "Travel" },
    { label: "Food" },
    { label: "Business" },
    { label: "social" },
];

const new_tags = [
    { label: "Tips" },
    { label: "Trending" },
    { label: "News" },
    { label: "Popular" },
];

function CategoryTags() {


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
                        fullWidth
                        id="new-category"
                        options={new_category}
                        getOptionLabel={(option) => option.label}
                        filterSelectedOptions
                        renderInput={(params) => (
                            <CustomTextField {...params} placeholder="Categories" />
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
                    <Autocomplete
                        multiple
                        fullWidth
                        id="new-tags"
                        options={new_tags}
                        getOptionLabel={(option) => option.label}
                        filterSelectedOptions
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