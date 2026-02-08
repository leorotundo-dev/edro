

import {
    Dialog,
    DialogTitle,
    DialogContent,


    Typography,

    Box,
    useTheme,

} from '@mui/material';


type DeatilModalProps = {
    open: boolean;
    onClose: () => void;
};


const authDetails = [
    { label: "App Name", value: "Example App" },
    {
        label: "Client ID",
        value: "e3b2c7f4-1234-5678-9abc-def012345678",
    },
    {
        label: "Client Secret",
        value: "s3cr3tK3y@9LmNopQR!2xYz",
    },
    {
        label: "Authentication base URI",
        value: "https://auth.example.com",
    },
];

const DetailModal: React.FC<DeatilModalProps> = ({ open, onClose }) => {

    const theme = useTheme();
    return (
        <Dialog open={open} onClose={onClose}>

            <DialogTitle>Integration details</DialogTitle>

            <DialogContent>


                <Typography variant="body1" mb={2.5}>
                    Check the credentials and settings for your connected app.
                </Typography>

                {/* Detail Card */}
                <Box>
                    {authDetails.map((item, idx) => (
                        <Box
                            key={idx}
                            sx={{
                                display: 'flex',

                                flexDirection: 'column',

                                alignItems: 'flex-start',
                                gap: 1,
                                py: 2,
                                borderRadius: 0,
                                borderBottom: `1px solid  ${theme.palette.divider}`,
                            }}
                        >
                            <Typography
                                variant="subtitle2"
                                color="text.secondary"

                            >
                                {item.label}
                            </Typography>

                            <Typography
                                variant="body1"
                                fontWeight={500}

                            >
                                {item.value}
                            </Typography>
                        </Box>


                    ))}

                </Box>

            </DialogContent>

        </Dialog >
    )
}

export default DetailModal