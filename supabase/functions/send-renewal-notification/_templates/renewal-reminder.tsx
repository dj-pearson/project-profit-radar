import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Button,
  Hr,
} from 'npm:@react-email/components@0.0.12'
import * as React from 'npm:react@18.3.1'

interface RenewalReminderEmailProps {
  customerName: string
  subscriptionTier: string
  daysUntilRenewal: number
  renewalDate: string
  manageUrl: string
}

export const RenewalReminderEmail = ({
  customerName,
  subscriptionTier,
  daysUntilRenewal,
  renewalDate,
  manageUrl,
}: RenewalReminderEmailProps) => (
  <Html>
    <Head />
    <Preview>Your BuildDesk subscription renews in {daysUntilRenewal} days</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Subscription Renewal Reminder</Heading>
        
        <Text style={text}>
          Hi {customerName},
        </Text>
        
        <Text style={text}>
          This is a friendly reminder that your <strong>{subscriptionTier}</strong> subscription 
          will automatically renew in <strong>{daysUntilRenewal} days</strong> on {renewalDate}.
        </Text>

        <Section style={section}>
          <Text style={highlightText}>
            Your construction management platform will continue without interruption.
          </Text>
        </Section>

        <Text style={text}>
          If you need to make any changes to your subscription or update your payment method, 
          you can manage everything through your account dashboard:
        </Text>

        <Button style={button} href={manageUrl}>
          Manage Subscription
        </Button>

        <Hr style={hr} />

        <Text style={text}>
          <strong>What happens next?</strong>
        </Text>
        <Text style={text}>
          • Your subscription will automatically renew on {renewalDate}<br/>
          • You'll continue to have access to all premium features<br/>
          • We'll charge your payment method on file<br/>
          • You'll receive a receipt via email
        </Text>

        <Text style={text}>
          Need help? Reply to this email or contact our support team. We're here to help!
        </Text>

        <Text style={footer}>
          Best regards,<br/>
          The BuildDesk Team<br/>
          <Link href="https://builddesk.com" style={link}>builddesk.com</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RenewalReminderEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '580px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px',
}

const highlightText = {
  color: '#059669',
  fontSize: '16px',
  lineHeight: '26px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '16px 0',
}

const section = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '16px',
}

const button = {
  backgroundColor: '#f97316',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '24px 40px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 40px',
}

const link = {
  color: '#f97316',
  textDecoration: 'underline',
}

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '32px 0 0 0',
  padding: '0 40px',
}