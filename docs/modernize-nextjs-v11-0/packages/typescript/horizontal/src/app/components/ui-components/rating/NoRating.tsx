"use client";

import * as React from "react";
import { Rating } from "@mui/material";
import ChildCard from "@/app/components/shared/ChildCard";

const NoRating = () => {
  return (
  
      <Rating name="no-value" value={null} />
  
  );
};
export default NoRating;
