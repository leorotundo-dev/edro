import React, { useContext, useEffect, useState } from 'react';
import { NotesContext } from '@/app/context/NotesContext/index';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Fab from '@mui/material/Fab';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { IconCheck, IconMenu2 } from '@tabler/icons-react';

import AddNotes from './AddNotes';
import { NotesType } from '../../../(DashboardLayout)/types/apps/notes';

export interface colorsType {
  lineColor: string;
  disp: string;
  id: number;
}

interface Props {
  toggleNoteSidebar: (event: React.MouseEvent<HTMLElement>) => void,
}

const NoteContent = ({ toggleNoteSidebar }: Props) => {

  const theme = useTheme();

  const { notes, updateNote, selectedNoteId } = useContext(NotesContext);
  const noteDetails = notes.find((note: NotesType) => note.id === selectedNoteId);
  // Initialize state for updatedTitle, initialTitle, and isEditing status
  const [initialTitle, setInitialTitle] = useState('');
  const [updatedTitle, setUpdatedTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false); // State to track whether editing is in progress


  // Effect to update initialTitle when noteDetails changes
  useEffect(() => {
    if (noteDetails?.title) {
      setInitialTitle(noteDetails.title);
      setUpdatedTitle(noteDetails.title);
    }
  }, [noteDetails]);

  // Function to handle changes in the title text field
  const handleTitleChange = (e: { target: { value: React.SetStateAction<string>; }; }) => {
    setUpdatedTitle(e.target.value);
    setIsEditing(true); // Set editing state to true when user starts editing
  };

  // Function to handle color change and update note
  const handleColorChange = (color: string) => {
    const titleToUse = isEditing ? updatedTitle : initialTitle;
    updateNote(selectedNoteId, titleToUse, color);
    console.log(color);
  };



  const handleBlur = () => {
    setIsEditing(false);
    if (noteDetails?.color) {
      updateNote(selectedNoteId, updatedTitle, noteDetails.color);
    }
  };


  const colorvariation: colorsType[] = [
    {
      id: 1,
      lineColor: theme.palette.warning.main,
      disp: 'warning',
    },
    {
      id: 2,
      lineColor: theme.palette.info.main,
      disp: 'info',
    },
    {
      id: 3,
      lineColor: theme.palette.error.main,
      disp: 'error',
    },
    {
      id: 4,
      lineColor: theme.palette.success.main,
      disp: 'success',
    },
    {
      id: 5,
      lineColor: theme.palette.primary.main,
      disp: 'primary',
    },
  ];

  return (
    <Box sx={{ height: { lg: 'calc(100vh - 250px)', sm: '100vh' }, maxHeight: '700px' }}>
      {/* ------------------------------------------- */}
      {/* Header Part */}
      {/* ------------------------------------------- */}
      <Box display="flex" alignItems="center" justifyContent="space-between" p={2}>
        <IconButton onClick={toggleNoteSidebar}>
          <IconMenu2 stroke={1.5} />
        </IconButton>
        <AddNotes colors={colorvariation} />
      </Box>
      <Divider />
      {/* ------------------------------------------- */}
      {/* Edit notes */}
      {/* ------------------------------------------- */}
      {noteDetails ? (
        <Box p={3}>
          <FormLabel htmlFor="outlined-multiline-static">
            <Typography variant="h6" mb={2} fontWeight={600} color="text.primary">
              Edit Note
            </Typography>
          </FormLabel>

          <TextField
            id="outlined-multiline-static"
            placeholder="Edit Note"
            multiline
            fullWidth
            rows={5}
            variant="outlined"
            value={isEditing ? updatedTitle : initialTitle}
            onChange={handleTitleChange}
            onBlur={handleBlur}
          />
          <br />
          <Typography variant="h6" mt={3} mb={2} fontWeight={600}>
            Change Note Color
          </Typography>

          {colorvariation.map((color1) => (
            <Fab
              sx={{
                marginRight: '3px',
                boxShadow: 'none',
                transition: '0.1s ease-in',
                scale: noteDetails.color === color1.disp ? '0.9' : '0.7',

              }}
              size="small"
              key={color1.id}

              color={color1?.disp as 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}

              onClick={() => handleColorChange(color1.disp)}
            >
              {noteDetails.color === color1.disp ? <IconCheck width="16" /> : ''}
            </Fab>
          ))}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', fontSize: '24px', mt: 2 }}>Select a Note</Box>
      )}
    </Box>
  );
};


export default NoteContent;
