import React from "react";
import { Chip } from "@mui/material";
import InlineItemCard from "@/app/components/shared/InlineItemCard";

const SizesChip = () => {
    return (
        <InlineItemCard>
            <Chip label="Small" size="small" color="primary" />
            <Chip label="Normal" color="primary" />
        </InlineItemCard>
    );
};

export default SizesChip;
