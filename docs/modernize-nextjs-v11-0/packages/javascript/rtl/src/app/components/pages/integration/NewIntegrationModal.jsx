

'use client'

import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Button,
    Box,
    useTheme,
    Select,
    TextField,
    DialogActions,
    InputLabel,
    MenuItem,
} from '@mui/material';



const NewIntegrationModal = ({ open, onClose }) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md">

            <DialogTitle>New integration</DialogTitle>

            <DialogContent>
                <Typography variant="body1" mb={2.5}>
                    Set up an integration and add a brief explanation for the team.
                </Typography>
                <Box>
                    <InputLabel
                        sx={{ my: 1 }}
                        htmlFor='client-id'
                    >
                        Select App
                    </InputLabel>
                    <Select id="apps" size="small" fullWidth value="Select an option">
                        <MenuItem value="Select an option">Select an option</MenuItem>
                        <MenuItem value="Google Meet">Google Meet</MenuItem>
                        <MenuItem value="Mailchimp">Mailchimp</MenuItem>
                        <MenuItem value="Zoom">Zoom</MenuItem>
                        <MenuItem value="Loom">Loom</MenuItem>

                    </Select>
                    <InputLabel
                        sx={{ my: 1 }}
                        htmlFor='client-id'
                    >
                        Client ID
                    </InputLabel>
                    <TextField
                        name='clientid'

                        type='text'
                        fullWidth
                    />
                    <InputLabel
                        sx={{ my: 1 }}
                        htmlFor='client-secret'
                    >
                        Client Secret
                    </InputLabel>
                    <TextField
                        name='clientsecret'

                        type='text'
                        fullWidth

                    />
                    <InputLabel
                        sx={{ my: 1 }}
                        htmlFor='authentication-url'
                    >
                        Authentication base URI
                    </InputLabel>
                    <TextField
                        name='authenticationurl'

                        type='text'
                        fullWidth

                    />
                </Box>

                <Typography variant="body1" mt={1.5}>
                    Paste the full URI, and we’ll automatically pull out and show only the subdomain for quick reference.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button color="primary" variant='contained' >Add Integration</Button>
                <Button color="error" variant='contained' onClick={onClose}>close</Button>
            </DialogActions>
        </Dialog >
    )
}

export default NewIntegrationModal