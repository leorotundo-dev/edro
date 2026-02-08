"use client";

import React from 'react'
import { useDropzone } from "react-dropzone";

import { Typography, Box } from "@mui/material";

function Media() {
    const { getRootProps, getInputProps } = useDropzone();

    return (
        <Box p={3}>
            <Typography variant="h5">Cover Image</Typography>
            <Box
                mt={3}
                sx={{
                    backgroundColor: "primary.light",
                    color: "primary.main",
                    padding: "40px 30px",
                    textAlign: "center",
                    border: "1px dashed",
                    borderColor: "primary.main",
                    cursor: "pointer",
                }}
                {...getRootProps()}
            >
                <input {...getInputProps()} />


                <Box textAlign="center">

                    <Typography variant="body2" sx={{ color: "primary.main" }}>
                        Click to upload or drag and drop
                    </Typography>
                    <Typography variant="caption" sx={{ color: "primary.main" }}>
                        SVG, PNG, JPG or GIF (MAX. 800x400px)
                    </Typography>
                </Box>
            </Box>


        </Box>
    )
}

export default Media