"use client";

import React from "react";
import { IconX } from "@tabler/icons-react";
import { Stack, Button, IconButton, Collapse, Alert } from "@mui/material";

const TransitionAlert = () => {
    const [open, setOpen] = React.useState(true);

    return (
        <Stack spacing={1}>
            <Collapse in={open}>
                <Alert
                    action={
                        <IconButton
                            aria-label="close"
                            color="inherit"
                            size="small"
                            onClick={() => {
                                setOpen(false);
                            }}
                        >
                            <IconX width={20} />
                        </IconButton>
                    }
                    sx={{ mb: 2 }}
                >
                    Close me!
                </Alert>
            </Collapse>
            <Button
                disabled={open}
                variant="outlined"
                size="small"
                onClick={() => {
                    setOpen(true);
                }}
            >
                Re-open
            </Button>
        </Stack>
    );
};

export default TransitionAlert;
