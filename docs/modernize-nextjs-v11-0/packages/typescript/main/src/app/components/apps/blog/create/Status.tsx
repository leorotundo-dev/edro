'use client'

import React, { useState } from 'react'

import { Grid, Typography, Avatar, MenuItem, Box } from '@mui/material';

import CustomSelect from '@/app/components/forms/theme-elements/CustomSelect';

function Status() {
    const [status, setStatus] = useState(0);
    const handleChange = (event: { target: { value: React.SetStateAction<number>; }; }) => {
        setStatus(event.target.value);
        console.log("test");
    };

    return (
        (<Box p={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h5">Blog Status</Typography>

                <Avatar
                    sx={{
                        backgroundColor:
                            status === 0
                                ? "primary.main"
                                : status === 1
                                    ? "error.main"
                                    : status === 2
                                        ? "secondary.main"
                                        : status === 3
                                            ? "warning.main"
                                            : "error.main",
                        "& svg": { display: "none" },
                        width: 15,
                        height: 15,
                    }}
                ></Avatar>
            </Box>
            <Grid container mt={3}>
                <Grid size={12}>
                    <CustomSelect value={status} onChange={handleChange} fullWidth>
                        <MenuItem value={0}>Published</MenuItem>
                        <MenuItem value={1}>Draft</MenuItem>
                        <MenuItem value={2}>Scheduled</MenuItem>
                        <MenuItem value={3}>In active</MenuItem>
                    </CustomSelect>
                    <Typography variant="body2">Set the Blog status.</Typography>
                </Grid>
            </Grid>
        </Box>)
    )
}

export default Status