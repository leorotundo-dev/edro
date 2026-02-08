"use client";

import React from "react";
import { Avatar, Chip } from "@mui/material";
import InlineItemCard from "@/app/components/shared/InlineItemCard";
import { IconMoodHappy } from "@tabler/icons-react";

const FilledChip = () => {
    const handleDelete = () => {
        console.info("You clicked the delete icon.");
    };

    return (
        <InlineItemCard>
            <Chip avatar={<Avatar>M</Avatar>} label="Default Filled" />
            <Chip
                avatar={<Avatar>M</Avatar>}
                label="Default Deletable"
                onDelete={handleDelete}
            />
            <Chip
                avatar={
                    <Avatar alt="Natacha" src={"/images/profile/user-4.jpg"} />
                }
                label="Primary Filled"
                color="primary"
            />
            <Chip
                avatar={
                    <Avatar alt="Natacha" src={"/images/profile/user-4.jpg"} />
                }
                label="Primary Deletable"
                color="primary"
                onDelete={handleDelete}
            />
            <Chip
                icon={<IconMoodHappy />}
                label="Secondary Filled"
                color="secondary"
            />
            <Chip
                icon={<IconMoodHappy />}
                label="Secondary Deletable"
                color="secondary"
                onDelete={handleDelete}
            />
            <Chip
                avatar={
                    <Avatar alt="Natacha" src={"/images/profile/user-2.jpg"} />
                }
                label="Success Filled"
                color="success"
            />
            <Chip
                avatar={
                    <Avatar alt="Natacha" src={"/images/profile/user-2.jpg"} />
                }
                label="Success Deletable"
                color="success"
                onDelete={handleDelete}
            />
            <Chip
                icon={<IconMoodHappy />}
                label="Warning Filled"
                color="warning"
            />
            <Chip
                icon={<IconMoodHappy />}
                label="Warning Deletable"
                color="warning"
                onDelete={handleDelete}
            />
            <Chip
                avatar={
                    <Avatar alt="Natacha" src={"/images/profile/user-3.jpg"} />
                }
                label="Error Filled"
                color="error"
            />
            <Chip
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

export default FilledChip;
