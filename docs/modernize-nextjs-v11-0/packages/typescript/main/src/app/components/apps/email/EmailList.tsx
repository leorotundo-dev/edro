import React, { useContext, useEffect, useState } from "react";
import List from '@mui/material/List';
import EmailListItem from "./EmailListItem";


import Scrollbar from "../../../components/custom-scroll/Scrollbar";
import { EmailType } from '../../../(DashboardLayout)/types/apps/email';
import { EmailContext } from "@/app/context/EmailContext";

interface Props {
  showrightSidebar: () => void;
}

const EmailList = ({ showrightSidebar }: Props) => {

  const { emails, setSelectedEmail, deleteEmail, filter, toggleStar, toggleImportant, searchQuery } = useContext(EmailContext);
  const [checkedItems, setCheckedItems] = useState<{ [key: number]: boolean }>({});
  const [selectedEmailId, setSelectedEmailId] = useState(emails.length > 0 ? emails[0].id : null);


  useEffect(() => {
    if (emails.length > 0 && selectedEmailId === null) {
      setSelectedEmail(emails[0]);
      setSelectedEmailId(emails[0].id);
    }
  }, [emails]);


  const handleCheckboxChange = (emailId: number) => {
    setCheckedItems(prevState => ({
      ...prevState,
      [emailId]: !prevState[emailId]
    }));
  };

  const handleDelete = (emailId: number) => {
    deleteEmail(emailId);
  };

  const filteredEmails = searchQuery
    ? emails.filter((email: { from: string; }) =>
      email.from.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : emails.filter((email: { [x: string]: any; starred: boolean; label: string; }) => {
      if (filter === 'starred') {
        return email.starred;
      } else if (['Promotional', 'Social', 'Health'].includes(filter as string)) {
        return email.label === filter;
      } else {
        return email[filter];
      }
    });


  const handleSelectEmail = (email: EmailType) => {
    setSelectedEmail(email);
    setSelectedEmailId(email.id);
    setCheckedItems({});

  };

  return (
    <List>
      <Scrollbar sx={{ height: { lg: 'calc(100vh - 100px)', md: '100vh' }, maxHeight: '800px' }}>
        {/* ------------------------------------------- */}
        {/* Email page */}
        {/* ------------------------------------------- */}
        {filteredEmails.map((email) => (
          <EmailListItem
            key={email.id}
            {...email}
            onClick={(e: { stopPropagation: () => void; }) => {
              e.stopPropagation();
              handleSelectEmail(email);
              showrightSidebar;
            }}
            onDelete={() => handleDelete(email.id)}
            isSelected={email.id === selectedEmailId}
            onStar={() => toggleStar(email.id)}
            onImportant={() => toggleImportant(email.id)}
            onChange={() => handleCheckboxChange(email.id)}
            checked={checkedItems[email.id]}
          />
        ))}
      </Scrollbar>
    </List>
  );
};

export default EmailList;
