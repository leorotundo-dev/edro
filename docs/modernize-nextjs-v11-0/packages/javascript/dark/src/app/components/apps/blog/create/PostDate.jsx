"use client";
import React, { useState } from "react";
import Box from "@mui/material/Box";
import { Grid, Typography } from "@mui/material";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

function PostDate() {
    const [selectedDate, setSelectedDate] = useState(dayjs());

    return (
        (<Box p={3}>
            <Typography variant="h5" mb={3}>
                Publish Date
            </Typography>
            <Grid container spacing={3}>
                <Grid size={12}>
                    <CustomFormLabel htmlFor="p_tax" sx={{ mt: 0 }}>
                        Select  Publish Date
                    </CustomFormLabel>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker

                            value={selectedDate}
                            onChange={(newValue) => setSelectedDate(newValue)}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                },
                            }}
                        />
                    </LocalizationProvider>
                    <Typography variant="body2" mt={1}>
                        Choose the date when this blog post should be published.
                    </Typography>
                </Grid>
            </Grid>
        </Box>)
    )
}

export default PostDate