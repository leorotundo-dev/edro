
import {
  IconCircleLetterT, IconNotification, IconTransfer, IconMenuDeep, IconGhost,
  IconBookmark, IconBell,
  IconMessageDots, IconClipboard, IconVacuumCleaner, IconClipboardText, IconCropPortrait
} from "@tabler/icons-react";
import { uniqueId } from "lodash";
import { ElementType } from "react";


export interface MenuitemsType {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: ElementType;
  href?: string;
  children?: MenuitemsType[];
  chip?: string;
  chipColor?: string;
  variant?: string;
  external?: boolean;
}


const Menuitems: MenuitemsType[] = [
  {
    navlabel: true,
    subheader: "UI COMPONENTS",
  },
  {
    id: uniqueId(),
    title: "Alert",
    icon: IconNotification,
    href: "/lpcomponents/ui-components/alert",
  },
  {
    id: uniqueId(),
    title: "Accordion",
    icon: IconMenuDeep,
    href: "/lpcomponents/ui-components/accordion",
  },
  {
    id: uniqueId(),
    title: "Avatar",
    icon: IconGhost,
    href: "/lpcomponents/ui-components/avatar",
  },
  {
    id: uniqueId(),
    title: "Chip",
    icon: IconBookmark,
    href: "/lpcomponents/ui-components/chip",
  },
  {
    id: uniqueId(),
    title: "Dialog",
    icon: IconMessageDots,
    href: "/lpcomponents/ui-components/dialog",
  },
  {
    id: uniqueId(),
    title: "List",
    icon: IconClipboard,
    href: "/lpcomponents/ui-components/list",
  },
  {
    id: uniqueId(),
    title: "Popover",
    icon: IconVacuumCleaner,
    href: "/lpcomponents/ui-components/popover",
  },
  {
    id: uniqueId(),
    title: "Rating",
    icon: IconClipboardText,
    href: "/lpcomponents/ui-components/rating",
  },
  {
    id: uniqueId(),
    title: "Tabs",
    icon: IconCropPortrait,
    href: "/lpcomponents/ui-components/tabs",
  },
  {
    id: uniqueId(),
    title: "Tooltip",
    icon: IconBell,
    href: "/lpcomponents/ui-components/tooltip",
  },
  {
    id: uniqueId(),
    title: "Transfer List",
    icon: IconTransfer,
    href: "/lpcomponents/ui-components/transfer-list",
  },
  {
    id: uniqueId(),
    title: "Typography",
    icon: IconCircleLetterT,
    href: "/lpcomponents/ui-components/typography",
  },

];

export default Menuitems;
