"use client";
import { Grid } from "@mui/material";
import ParentCard from "@/app/components/shared/ParentCard";

// CodeModels
import Heading1Code from "@/app/components/ui-components/typography/code/Heading1Code";
import Heading2Code from "@/app/components/ui-components/typography/code/Heading2Code";
import Heading3Code from "@/app/components/ui-components/typography/code/Heading3Code";
import Heading4Code from "@/app/components/ui-components/typography/code/Heading4Code";
import Heading5Code from "@/app/components/ui-components/typography/code/Heading5Code";
import Heading6Code from "@/app/components/ui-components/typography/code/Heading6Code";
import Subtitle1Code from "@/app/components/ui-components/typography/code/Subtitle1Code";
import Subtitle2Code from "@/app/components/ui-components/typography/code/Subtitle2Code";
import Body1Code from "@/app/components/ui-components/typography/code/Body1Code";
import Body2Code from "@/app/components/ui-components/typography/code/Body2Code";
import CaptionCode from "@/app/components/ui-components/typography/code/CaptionCode";
import OverlineCode from "@/app/components/ui-components/typography/code/OverlineCode";
import TextPrimaryCode from "@/app/components/ui-components/typography/code/TextPrimaryCode";
import TextSecondaryCode from "@/app/components/ui-components/typography/code/TextSecondaryCode";
import TextInfoCode from "@/app/components/ui-components/typography/code/TextInfoCode";
import TextWarningCode from "@/app/components/ui-components/typography/code/TextWarningCode";
import TextErrorCode from "@/app/components/ui-components/typography/code/TextErrorCode";
import TextSuccessCode from "@/app/components/ui-components/typography/code/TextSuccessCode";

const TypographyCommon = () => {
  return (
    <Grid container spacing={3}>
      <Grid size={{ sm: 12 }}>
        <ParentCard title="Default Text">
          <Grid container spacing={3}>
            <Grid size={{ sm: 12 }}>
              <Heading1Code />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <Heading2Code />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <Heading3Code />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <Heading4Code />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <Heading5Code />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <Heading6Code />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <Subtitle1Code />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <Subtitle2Code />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <Body1Code />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <Body2Code />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <CaptionCode />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <OverlineCode />
            </Grid>
          </Grid>
        </ParentCard>
      </Grid>
      <Grid size={{ sm: 12 }}>
        <ParentCard title="Text Colors">
          <Grid container spacing={3}>
            <Grid size={{ sm: 12 }}>
              <TextPrimaryCode />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <TextSecondaryCode />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <TextInfoCode />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <TextWarningCode />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <TextErrorCode />
            </Grid>
            <Grid size={{ sm: 12 }}>
              <TextSuccessCode />
            </Grid>
          </Grid>
        </ParentCard>
      </Grid>
    </Grid>
  );
};

export default TypographyCommon;

