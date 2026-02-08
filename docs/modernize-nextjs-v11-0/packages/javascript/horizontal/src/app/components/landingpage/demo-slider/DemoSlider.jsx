'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import { Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

import DemoTitle from './DemoTitle';
import Image from 'next/image';


const demos = [
  {
    link: "https://modernize-nextjs.adminmart.com/dashboards/modern",
    img: "/images/landingpage/demos/demo-main.jpg",
    title: "Main",
  },
  {
    link: "https://modernize-nextjs-dark.vercel.app/dashboards/ecommerce",
    img: "/images/landingpage/demos/demo-dark.jpg",
    title: "Dark",
  },
  {
    link: "https://modernize-nextjs-horizontal.vercel.app/dashboards/modern",
    img: "/images/landingpage/demos/demo-horizontal.jpg",
    title: "Horizontal",
  },
  {
    link: "https://modernize-nextjs-rtl.vercel.app/",
    img: "/images/landingpage/demos/demo-rtl.jpg",
    title: "RTL",
  },
  {
    link: "https://modernize-nextjs-minisidebar.vercel.app/",
    img: "/images/landingpage/demos/demo-minisidebar.jpg",
    title: "Minisidebar",
  },
  {
    link: "https://modernize-nextjs-nextauth.vercel.app/",
    img: "/images/landingpage/demos/demo-nextauth.jpg",
    title: "Nextauth",
  },
];

const pages = [
  {
    link: 'https://modernize-nextjs.adminmart.com/frontend-pages/homepage',
    img: "/images/landingpage/f-pages/page-homepage.jpg",

    title: 'Homepage',
  },
  {
    link: 'https://modernize-nextjs.adminmart.com/frontend-pages/about',
    img: "/images/landingpage/f-pages/page-about.jpg",

    title: 'About us',
  },
  {
    link: 'https://modernize-nextjs.adminmart.com/frontend-pages/portfolio',
    img: "/images/landingpage/f-pages/page-portfolio.jpg",

    title: 'Portfolio',
  },
  {
    link: 'https://modernize-nextjs.adminmart.com/frontend-pages/pricing',
    img: "/images/landingpage/f-pages/page-pricing.jpg",

    title: 'Pricing',
  },
];

const apps = [
  {
    link: "https://modernize-nextjs.adminmart.com/apps/kanban",
    img: "/images/landingpage/apps/app-kanban.jpg",
    hot: true,
    title: "Kanban App",
  },
  {
    link: "https://modernize-nextjs.adminmart.com/apps/invoice/list",
    img: "/images/landingpage/apps/app-invoice.jpg",
    hot: true,
    title: "Invoice App",
  },
  {
    link: "https://modernize-nextjs.adminmart.com/apps/calendar",
    img: "/images/landingpage/apps/app-calendar.jpg",
    title: "Calendar App",
  },
  {
    link: "https://modernize-nextjs.adminmart.com/apps/chats",
    img: "/images/landingpage/apps/app-chat.jpg",
    title: "Chat App",
  },
  {
    link: "https://modernize-nextjs.adminmart.com/apps/contacts",
    img: "/images/landingpage/apps/app-contact.jpg",
    title: "Contact App",
  },
  {
    link: "https://modernize-nextjs.adminmart.com/apps/email",
    img: "/images/landingpage/apps/app-email.jpg",
    title: "Email App",
  },
  {
    link: "https://modernize-nextjs.adminmart.com/apps/notes",
    img: "/images/landingpage/apps/app-note.jpg",
    title: "Note App",
  },
  {
    link: "https://modernize-nextjs.adminmart.com/apps/user-profile/profile",
    img: "/images/landingpage/apps/app-user-profile.jpg",
    title: "User Profile App",
  },
  {
    link: "https://modernize-nextjs.adminmart.com/apps/blog/post",
    img: "/images/landingpage/apps/app-blog.jpg",
    title: "Blog App",
  },
  {
    link: "https://modernize-nextjs.adminmart.com/apps/tickets",
    img: "/images/landingpage/apps/app-ticket.jpg",
    title: "Ticket App",
  },
  {
    link: "https://modernize-nextjs.adminmart.com/apps/ecommerce/shop",
    img: "/images/landingpage/apps/app-ecommerce-shop.jpg",
    title: "eCommerce Shop App",
  },
  {
    link: "https://modernize-nextjs.adminmart.com/apps/ecommerce/checkout",
    img: "/images/landingpage/apps/app-ecommerce-checkout.jpg",
    title: "eCommerce Checkout App",
  },
  {
    link: "https://modernize-nextjs.adminmart.com/apps/ecommerce/list",
    img: "/images/landingpage/apps/app-ecommerce-list.jpg",
    title: "eCommerce List App",
  },

];

const StyledBox = styled(Box)(() => ({
  overflow: 'auto',
  position: 'relative',
  border: 1,
  borderStyle: 'solid',
  borderColor: '#efefef',
  '.MuiButton-root': {
    display: 'none',
  },
  '&:hover': {
    '.MuiButton-root': {
      display: 'block',
      transform: 'translate(-50%,-50%)',
      position: 'absolute',
      left: '50%',
      right: '50%',
      top: '50%',
      minWidth: '100px',
      zIndex: '9',
    },
    '&:before': {
      content: '""',
      position: 'absolute',
      top: '0',
      left: ' 0',
      width: '100%',
      height: '100%',
      zIndex: '8',
      backgroundColor: 'rgba(55,114,255,.2)',
    },
  },
}));

const DemoSlider = () => {
  return (
    (<Box
      id="demos"
      sx={{
        pb: "140px",
        overflow: "hidden",

        pt: {
          sm: '60px',
          lg: '0',
        }
      }}>
      <Container maxWidth="lg">
        {/* Title */}
        <DemoTitle />

        {/* demos */}
        <Box sx={{
          mt: 9
        }}>
          <Grid container spacing={3} sx={{
            mt: 2
          }}>
            {demos.map((demo, index) => (
              <Grid
                key={index}
                size={{
                  xs: 12,
                  sm: 4,
                  lg: 4
                }}>
                <Box>
                  <StyledBox>
                    <Image
                      src={demo.img}
                      alt="demo" width={500} height={500}
                      style={{
                        borderRadius: '8px',
                        width: '100%',
                        height: '100%',
                      }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      href={demo.link}
                      target="_blank"
                    >
                      Live Preview
                    </Button>
                  </StyledBox>
                  <Typography
                    variant="h6"
                    color="textPrimary"
                    sx={{
                      textAlign: "center",
                      fontWeight: 500,
                      mt: 2
                    }}>
                    {demo.title}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
        <Box
          sx={{
            mb: 2,
            mt: 5,
            textAlign: "center"
          }}>
          <Chip label="Frontend Pages" color="primary" />
        </Box>
        {/* apps */}
        <Box>
          <Grid container spacing={3} sx={{
            mt: 2
          }}>
            {pages.map((page, index) => (
              <Grid
                key={index}
                size={{
                  xs: 12,
                  lg: 3
                }}>
                <Box>
                  <StyledBox>
                    <Image
                      src={page.img} width={500} height={500}
                      alt="app"
                      style={{
                        borderRadius: '8px',
                        width: '100%',
                        height: '100%',
                      }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      href={page.link}
                      target="_blank"
                    >
                      Live Preview
                    </Button>
                  </StyledBox>
                  <Typography
                    variant="h6"
                    color="textPrimary"
                    sx={{
                      textAlign: "center",
                      fontWeight: 500,
                      mt: 2
                    }}>
                    {page.title} {page.hot ? <Chip label="New" color="error" size="small" /> : null}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
        <Box
          sx={{
            mb: 2,
            mt: 5,
            textAlign: "center"
          }}>
          <Chip label="Apps" color="primary" />
        </Box>
        {/* apps */}
        <Box>
          <Grid container spacing={3} sx={{
            mt: 2
          }}>
            {apps.map((app, index) => (
              <Grid
                key={index}
                size={{
                  xs: 12,
                  lg: 3
                }}>
                <Box>
                  <StyledBox>
                    <Image
                      src={app.img} width={500} height={500}
                      alt="app"
                      style={{
                        borderRadius: '8px',
                        width: '100%',
                        height: '100%',
                      }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      href={app.link}
                      target="_blank"
                    >
                      Live Preview
                    </Button>
                  </StyledBox>
                  <Typography
                    variant="h6"
                    color="textPrimary"
                    sx={{
                      textAlign: "center",
                      fontWeight: 500,
                      mt: 2
                    }}>
                    {app.title} {app.hot ? <Chip label="New" color="error" size="small" /> : null}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </Box>)
  );
};

export default DemoSlider;
