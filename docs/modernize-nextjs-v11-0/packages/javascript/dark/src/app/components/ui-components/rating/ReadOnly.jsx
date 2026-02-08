"use client";

import * as React from "react";
import { Rating } from "@mui/material";


const ReadOnly = () => {
  const [value, setValue] = React.useState(2);

  return <Rating name="read-only" value={value} readOnly />;
};
export default ReadOnly;
