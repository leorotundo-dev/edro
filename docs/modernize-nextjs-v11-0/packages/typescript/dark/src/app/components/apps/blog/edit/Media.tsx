"use client";

import React from 'react'
import { useDropzone } from "react-dropzone";

import { Typography, Box } from "@mui/material";
import { BlogContext } from '@/app/context/BlogContext';
import { useContext } from "react";

function Media() {
    const { getRootProps, getInputProps } = useDropzone();
    const { posts } = useContext(BlogContext);
    const coverImage = posts.length > 0 ? posts[0].coverImg : null;

    return (
        <Box p={3}>
            <Typography variant="h5" sx={{ mb: 2 }}>
                Cover Image
            </Typography>

            <Box
                {...getRootProps()}
                sx={{
                    height: 256,
                    width: "100%",
                    border: "1px dashed",
                    borderColor: "primary.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    overflow: "hidden",
                }}

            >
                <input {...getInputProps()} />
                {coverImage ? (
                    <img
                        src={coverImage}
                        alt="Cover"
                        style={{
                            height: "100%",
                            width: "100%",
                            objectFit: "cover",

                        }}
                    />
                ) : (
                    <>

                        <Box textAlign="center">

                            <Typography variant="body2" sx={{ color: "primary.main" }}>
                                Click to upload or drag and drop
                            </Typography>
                            <Typography variant="caption" sx={{ color: "primary.main" }}>
                                SVG, PNG, JPG or GIF (MAX. 800x400px)
                            </Typography>
                        </Box>
                    </>
                )}
            </Box>
        </Box>
    )
}

export default Media