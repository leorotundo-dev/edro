import React, { useContext } from "react";
import PropTypes from "prop-types";
import Link from "next/link";

// mui imports
import List from "@mui/material/List";
import ListItemButton from '@mui/material/ListItemButton';

import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { styled, useTheme } from "@mui/material/styles";
import { CustomizerContext } from "@/app/context/customizerContext";

import useMediaQuery from '@mui/material/useMediaQuery';


const NavItem = ({ item, level, pathDirect, onClick }) => {
  const lgDown = useMediaQuery((theme) => theme.breakpoints.down("lg"));
  const { isBorderRadius } = useContext(CustomizerContext);

  const Icon = item.icon;
  const theme = useTheme();
  const itemIcon =
    level > 1 ? (
      <Icon stroke={1.5} size="1rem" />
    ) : (
      <Icon stroke={1.5} size="1.1rem" />
    );
  const ListItemStyled = styled(ListItemButton)(() => ({
    whiteSpace: "nowrap",
    padding: '5px 10px',
    gap: '10px',
    borderRadius: `${isBorderRadius}px`,
    marginBottom: level > 1 ? '3px' : '0px',
    backgroundColor: level > 1 ? "transparent !important" : "inherit",
    color:
      level > 1 && pathDirect === item?.href
        ? `${theme.palette.primary.main}!important`
        : theme.palette.text.secondary,
    "&:hover": {
      backgroundColor: theme.palette.primary.light,
      color: theme.palette.primary.main,
    },
    "&.Mui-selected": {
      color: "white",
      backgroundColor: theme.palette.primary.main,
      "&:hover": {
        backgroundColor: theme.palette.primary.main,
        color: "white",
      },
    },
  }));

  const listItemProps = {
    component: item?.external ? "a" : Link,
    to: item?.href,
    href: item?.external ? item?.href : "",
    target: item?.external ? "_blank" : "",
  };

  return (
    <List disablePadding key={item.id} component="li" >
      <Link href={item.href}>
        <ListItemStyled
          disabled={item.disabled}
          selected={pathDirect === item.href}
          onClick={lgDown ? onClick : undefined}
        >
          <ListItemIcon
            sx={{
              minWidth: "auto",
              p: "3px 0",
              color:
                level > 1 && pathDirect === item?.href
                  ? `${theme.palette.primary.main}!important`
                  : "inherit",
            }}
          >
            {itemIcon}
          </ListItemIcon>
          <ListItemText>{item.title}</ListItemText>
        </ListItemStyled>
      </Link>
    </List>
  );
};

NavItem.propTypes = {
  item: PropTypes.object,
  level: PropTypes.number,
  pathDirect: PropTypes.any,
  hideMenu: PropTypes.any,
};

export default NavItem;
