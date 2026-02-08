"use client";

import React from "react";
import { Avatar, Chip } from "@mui/material";
import InlineItemCard from "@/app/components/shared/InlineItemCard";
import { IconCheck, IconChecks } from "@tabler/icons-react";

const CustomIconChip = () => {
    const handleDelete = () => {
        console.info("You clicked the delete icon.");
    };

    return (
        <InlineItemCard>
            <Chip
                label="Custom Icon"
                color="primary"
                avatar={<Avatar>M</Avatar>}
                onDelete={handleDelete}
                deleteIcon={<IconCheck width={20} />}
            />
            <Chip
                label="Custom Icon"
                color="secondary"
                avatar={<Avatar>S</Avatar>}
                onDelete={handleDelete}
                deleteIcon={<IconChecks width={20} />}
            />
        </InlineItemCard>
    );
};

export default CustomIconChip;
