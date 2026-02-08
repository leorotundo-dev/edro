"use client";

import React from "react";
import { Avatar, Chip } from "@mui/material";
import InlineItemCard from "@/app/components/shared/InlineItemCard";

const DisabledChip = () => {
    const handleDelete = () => {
        console.info("You clicked the delete icon.");
    };

    return (
        <InlineItemCard>
            <Chip
                label="Disabled Default"
                disabled
                avatar={<Avatar>M</Avatar>}
                onDelete={handleDelete}
            />
            <Chip
                label="Disabled Primary"
                color="primary"
                disabled
                avatar={<Avatar>S</Avatar>}
                onDelete={handleDelete}
            />
        </InlineItemCard>
    );
};

export default DisabledChip;
