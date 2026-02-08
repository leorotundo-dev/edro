import React from "react";
import { Stack, Alert, Button } from "@mui/material";

const ActionAlert = () => {
    return (
        <Stack spacing={1}>
            <Alert variant="filled" severity="warning">
                This is a success alert — check it out!
            </Alert>
            <Alert
                variant="filled"
                severity="info"
                action={
                    <Button color="inherit" size="small">
                        UNDO
                    </Button>
                }
            >
                This is a success alert — check it out!
            </Alert>
        </Stack>
    );
};

export default ActionAlert;
