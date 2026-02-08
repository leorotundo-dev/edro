

import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Button,
    DialogActions,

} from '@mui/material';

const RemoveModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    return (
        <Dialog open={open} onClose={onClose}>

            <DialogTitle>Remove Integration</DialogTitle>

            <DialogContent>

                <Typography variant="body1">
                    Are you sure you want to remove this integration?
                </Typography>
            </DialogContent>
            <DialogActions>

                <Button color="primary" variant="contained" onClick={() => {
                    onClose();
                }}>
                    Yes, Remove
                </Button>
                <Button onClick={onClose} variant="contained" color='error'>Cancel</Button>
            </DialogActions>
        </Dialog>
    );
};
export default RemoveModal