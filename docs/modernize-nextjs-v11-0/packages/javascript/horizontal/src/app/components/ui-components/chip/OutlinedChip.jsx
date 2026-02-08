"use client";

import React from "react";
import { Avatar, Chip } from "@mui/material";
import InlineItemCard from "@/app/components/shared/InlineItemCard";
import { IconMoodHappy } from "@tabler/icons-react";

const OutlinedChip = () => {
    const handleDelete = () => {
        console.info("You clicked the delete icon.");
    };

    return (
        <InlineItemCard>
            <Chip
                variant="outlined"
                avatar={<Avatar>M</Avatar>}
                label="Default Outlined"
            />
            <Chip
                variant="outlined"
                avatar={<Avatar>M</Avatar>}
                label="Default Deletable"
                onDelete={handleDelete}
            />
            <Chip
                variant="outlined"
                avatar={
                    <Avatar alt="Natacha" src={"/images/profile/user-4.jpg"} />
                }
                label="Primary Outlined"
                color="primary"
            />
            <Chip
                variant="outlined"
                avatar={
                    <Avatar alt="Natacha" src={"/images/profile/user-4.jpg"} />
                }
                label="Primary Deletable"
                color="primary"
                onDelete={handleDelete}
            />
            <Chip
                variant="outlined"
                icon={<IconMoodHappy />}
                label="Secondary Outlined"
                color="secondary"
            />
            <Chip
                variant="outlined"
                icon={<IconMoodHappy />}
                label="Secondary Deletable"
                color="secondary"
                onDelete={handleDelete}
            />
            <Chip
                variant="outlined"
                avatar={
                    <Avatar alt="Natacha" src={"/images/profile/user-2.jpg"} />
                }
                label="Success Outlined"
                color="success"
            />
            <Chip
                variant="outlined"
                avatar={
                    <Avatar alt="Natacha" src={"/images/profile/user-2.jpg"} />
                }
                label="Success Deletable"
                color="success"
                onDelete={handleDelete}
            />
            <Chip
                variant="outlined"
                icon={<IconMoodHappy />}
                label="Warning Outlined"
                color="warning"
            />
            <Chip
                variant="outlined"
                icon={<IconMoodHappy />}
                label="Warning Deletable"
                color="warning"
                onDelete={handleDelete}
            />
            <Chip
                variant="outlined"
                avatar={
                    <Avatar alt="Natacha" src={"/images/profile/user-3.jpg"} />
                }
                label="Error Outlined"
                color="error"
            />
            <Chip
                variant="outlined"
                avatar={
                    <Avatar alt="Natacha" src={"/images/profile/user-3.jpg"} />
                }
                label="Error Deletable"
                color="error"
                onDelete={handleDelete}
            />
        </InlineItemCard>
    );
};

export default OutlinedChip;
