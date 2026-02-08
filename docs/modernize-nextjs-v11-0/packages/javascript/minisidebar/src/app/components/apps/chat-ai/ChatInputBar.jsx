'use client'

import React, { useRef, useState } from "react";
import { Box, InputAdornment, IconButton } from "@mui/material";
import CustomTextField from "../../forms/theme-elements/CustomTextField";
import { IconLibraryPhoto, IconArrowUp } from "@tabler/icons-react";

export default function ChatInputBar({
  onSearchSubmit,
  onFileUpload,
}) {
  const [input, setInput] = useState("");

  const fileInputRef = useRef(null);

  const handleSend = () => {
    if (!input.trim()) return;
    onSearchSubmit(input);
    setInput("");
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  };
  return (
    <Box>
      <CustomTextField
        fullWidth
        variant="outlined"
        size="small"
        placeholder="Ask anything..."
        value={input}
        onChange={(e) =>
          setInput(e.target.value)
        }
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        sx={{
          backgroundColor: "blackColor.black5",

          "& .MuiOutlinedInput-root": {
            px: 1,
            py: 0.1,
          },
          "& input": {
            paddingLeft: 0,
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <IconButton onClick={handleImageClick} size="small">
                <IconLibraryPhoto stroke="blackColor.black10" />
              </IconButton>
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={handleSend}
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  p: "3px",
                }}
                size="small"
              >
                {" "}
                <IconArrowUp />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </Box>
  );
}
