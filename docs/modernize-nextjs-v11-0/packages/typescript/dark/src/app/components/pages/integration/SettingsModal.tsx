

import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Button,
    Box,

    Select,
    TextField,
    DialogActions,
    InputLabel,
    MenuItem,
} from '@mui/material';

type SettingModalProps = {
    open: boolean;
    onClose: () => void;
};


const SettingsModal: React.FC<SettingModalProps> = ({ open, onClose }) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md">

            <DialogTitle>Integration settings</DialogTitle>

            <DialogContent>

                <Typography variant="body1" mb={2.5}>
                    Manage and configure your connected apps and services.
                </Typography>
                <Box >
                    <InputLabel
                        htmlFor='select-app'
                        sx={{ my: 1 }}
                    >
                        Select App
                    </InputLabel>
                    <Select id="apps" disabled size="small" value="Select an option" fullWidth>
                        <MenuItem value="Select an option">Select an option</MenuItem>
                    </Select>
                    <InputLabel
                        htmlFor='client-id'
                        sx={{ my: 1 }}
                    >
                        Client ID
                    </InputLabel>
                    <TextField
                        name='clientid'

                        type='text'
                        fullWidth
                        value="e3b2c7f4-1234-5678-9abc-def012345678"


                    />
                    <InputLabel
                        htmlFor='client-secret'
                        sx={{ my: 1 }}>
                        Client Secret
                    </InputLabel>
                    <TextField
                        name='clientsecret'
                        className='!form-control'
                        type='text'
                        fullWidth
                        value="s3cr3tK3y@9LmNopQR!2xYz"


                    />
                    <InputLabel
                        htmlFor='authentication-url'
                        sx={{ my: 1 }}>
                        Authentication base URI
                    </InputLabel>
                    <TextField
                        name='authenticationurl'

                        type='text'
                        value="https://auth.example.com"
                        fullWidth

                    />
                </Box>

                <Typography variant="body1" mt={1.5}>
                    Save your changes.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button color="primary" variant='contained' >save</Button>
                <Button color="error" variant='contained' onClick={onClose}>close</Button>

            </DialogActions>
        </Dialog >
    );
};

export default SettingsModal;