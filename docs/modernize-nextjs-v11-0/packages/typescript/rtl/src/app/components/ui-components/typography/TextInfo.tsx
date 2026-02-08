"use client";
import React from 'react';
import { Typography } from '@mui/material';

const TextInfo = () => {
    return (
        <>
            <Typography
                variant="h5"
                sx={{ color: (theme) => theme.palette.info.main }}
            >
                Text Info
            </Typography>

            <Typography
                variant="body1"
                sx={{ color: (theme) => theme.palette.info.main }}
            >
                Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
                blanditiis tenetur
            </Typography>
        </>
    );
};

export default TextInfo;
