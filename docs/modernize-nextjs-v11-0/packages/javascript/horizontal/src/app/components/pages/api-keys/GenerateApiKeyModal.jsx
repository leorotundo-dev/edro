import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Button,
  Box,
} from "@mui/material";



const GenerateApiKeyModal = ({
  open,
  onClose,
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Generate New API Key</DialogTitle>

      <DialogContent>
        <Typography variant="body1" sx={{ mb: 3 }}>
          To enable secure access to the web services, your app requires an API
          key with permissions for resources such as the S3 bucket.
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Enter Your Application Name
          </Typography>
          <TextField
            name="applicationName"
            fullWidth
            variant="outlined"
            size="small"
            required
          />
        </Box>

        <Typography variant="body2" sx={{ mt: 2 }}>
          Naming your application makes it easier to recognize your API key in
          the future.
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button variant="contained" color="primary">
          Generate API Key
        </Button>
        <Button variant="contained" color="error" onClick={onClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GenerateApiKeyModal;
