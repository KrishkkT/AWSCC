import { sendEmail } from '../emailService.js';
import { OnePassDB } from './db.js';

/**
 * Premium, ultra-clean responsive AWSCC HTML Email Wrapper
 * Guaranteed 100% text contrast & visibility on Gmail, Apple Mail, and Outlook (Light & Dark modes).
 */
function wrapHtmlEmail({ title, preheader = '', contentHtml, eventName = 'AWS Community Day', category = 'EVENT OPERATIONS' }) {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${title}</title>
  <style type="text/css">
    /* Client-specific resets */
    body, table, td, a, p { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #070B14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #FFFFFF; }

    /* Responsive utilities */
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: auto !important; border-radius: 0 !important; }
      .fluid-padding { padding-left: 18px !important; padding-right: 18px !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important; }
      .mobile-center { text-align: center !important; }
      .session-data-label { width: 100% !important; display: block !important; padding-bottom: 2px !important; }
      .session-data-value { width: 100% !important; display: block !important; padding-bottom: 12px !important; }
    }
  </style>
</head>
<body style="background-color: #070B14; margin: 0; padding: 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Hidden Preheader snippet for inbox list preview -->
  <div style="display: none; font-size: 1px; color: #070B14; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${preheader || title} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #070B14;">
    <tr>
      <td align="center" style="padding: 10px 12px;">
        <!-- Email Card Shell (600px Max) -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0F172A; border-radius: 16px; border: 1px solid #1E293B; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" class="email-container">
          
          <!-- Top AWS Brand Accent Line -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #FF9900 0%, #0073BB 50%, #4F8EF7 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 32px 30px 24px 30px; background: linear-gradient(180deg, #131F37 0%, #0F172A 100%); border-bottom: 1px solid #1E293B;" class="fluid-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <!-- Category Badge -->
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color: rgba(0, 115, 187, 0.25); border: 1px solid #4F8EF7; border-radius: 20px; padding: 4px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 800; color: #4F8EF7; letter-spacing: 0.08em; text-transform: uppercase;">
                          ${category}
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; color: #94A3B8; font-family: monospace; font-weight: 700; letter-spacing: 0.05em;">AWSCC ONEPASS</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 14px;">
                    <h1 style="margin: 0; color: #FFFFFF !important; font-size: 22px; font-weight: 800; line-height: 1.3; letter-spacing: -0.02em;">
                      ${eventName}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding: 32px 30px; color: #FFFFFF !important; font-size: 15px; line-height: 1.7;" class="fluid-padding">
              ${contentHtml}
            </td>
          </tr>

          <!-- Help Desk Support Bar -->
          <tr>
            <td style="padding: 16px 30px; background-color: #0B1120; border-top: 1px solid #1E293B; border-bottom: 1px solid #1E293B;" class="fluid-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size: 12px; color: #CBD5E1 !important; line-height: 1.5;">
                    <strong style="color: #FFFFFF !important;">Need Help at Venue?</strong> Head to the AWS Student Builder Group Team.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="padding: 24px 30px; background-color: #070B14; text-align: center; font-size: 12px; color: #94A3B8 !important; line-height: 1.6;" class="fluid-padding">
              <p style="margin: 0 0 6px 0; font-weight: 700; color: #CBD5E1 !important;">AWS Student Builder Group at DDIT Nadiad • Powered by DDU AWS Academy.</p>
              <p style="margin: 0; color: #64748B !important; font-size: 11px;">This is an automated operational dispatch. Please keep this email handy on your mobile phone for session entrance and desk verification.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * 1. Send Instant Post Check-In Confirmation with Session Location Guidance
 */
export async function sendCheckInWelcomeEmail({ attendee, event, track = null, workshop = null }) {
  if (!attendee?.email) return { success: false, error: 'No email address' };

  const eventName = event?.name || 'AWS Community Day';
  const venueName = event?.venue || 'Campus Main Auditorium Complex';
  const isWorkshop = !!workshop;
  const sessionTitle = isWorkshop ? workshop.name : track ? track.name : 'General Track Session';
  const sessionLocation = isWorkshop ? (workshop.location || 'Workshop Lab / Ground Floor') : (track?.room_number || track?.location || 'Main Auditorium Floor');
  const sessionTime = isWorkshop ? `${workshop.start_time || '10:00 AM'} - ${workshop.end_time || '01:00 PM'}` : (event?.start_time ? `${event.start_time} - ${event.end_time}` : 'Full Day');

  const contentHtml = `
      <p style="font-size: 16px; margin: 0 0 16px 0; color: #FFFFFF !important; line-height: 1.5;">
        Hello <strong style="color: #FFFFFF !important; font-weight: 800;">${attendee.name}</strong>,
      </p>

      <p style="margin: 0 0 20px 0; color: #F1F5F9 !important; line-height: 1.6; font-size: 15px;">
        🎉 Welcome to <strong style="color: #FFFFFF !important; font-weight: 800;">${eventName}</strong>! You have been successfully verified and checked in at the registration desk.
      </p>

      <!-- Primary Confirmed Session Card -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0A0F1D; border: 1px solid #1E293B; border-radius: 12px; margin: 0 0 24px 0; overflow: hidden;">
        <tr>
          <td style="padding: 14px 18px; background-color: #131E35; border-bottom: 1px solid #1E293B;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="font-size: 11px; font-weight: 800; color: #FF9900 !important; letter-spacing: 0.05em; text-transform: uppercase;">
                  ${isWorkshop ? '🔬 ALLOCATED HANDS-ON WORKSHOP' : '🎯 ALLOCATED TRACK SESSION'}
                </td>
                <td align="right">
                  <span style="font-size: 10px; font-weight: 800; color: #10B981 !important; background: rgba(16, 185, 129, 0.18); padding: 4px 10px; border-radius: 12px; border: 1px solid #10B981;">
                    ● CONFIRMED
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 18px;">
            <div style="font-size: 18px; font-weight: 800; color: #FFFFFF !important; line-height: 1.4; margin-bottom: 16px;">
              ${sessionTitle}
            </div>

            <!-- Structured Session Details Table with BOLD Titles -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #FFFFFF !important;">
              <tr>
                <td class="session-data-label" style="padding: 8px 0; width: 145px; color: #FFFFFF !important; font-weight: 800;">
                  📍 <strong style="color: #FFFFFF !important; font-weight: 800;">Room / Location:</strong>
                </td>
                <td class="session-data-value" style="padding: 8px 0; color: #4F8EF7 !important; font-weight: 800; font-size: 15px;">
                  ${sessionLocation}
                </td>
              </tr>
              <tr>
                <td class="session-data-label" style="padding: 8px 0; width: 145px; color: #FFFFFF !important; font-weight: 800;">
                  🕒 <strong style="color: #FFFFFF !important; font-weight: 800;">Scheduled Time:</strong>
                </td>
                <td class="session-data-value" style="padding: 8px 0; color: #FFFFFF !important; font-weight: 700;">
                  ${sessionTime}
                </td>
              </tr>
              <tr>
                <td class="session-data-label" style="padding: 8px 0; width: 145px; color: #FFFFFF !important; font-weight: 800;">
                  🎟️ <strong style="color: #FFFFFF !important; font-weight: 800;">Booking ID:</strong>
                </td>
                <td class="session-data-value" style="padding: 8px 0;">
                  <code style="background-color: #1E293B; color: #FF9900 !important; padding: 3px 8px; border-radius: 5px; font-family: monospace; font-size: 13px; font-weight: 800; border: 1px solid rgba(255, 153, 0, 0.4);">
                    ${attendee.booking_id || attendee.id}
                  </code>
                </td>
              </tr>
              <tr>
                <td class="session-data-label" style="padding: 8px 0; width: 145px; color: #FFFFFF !important; font-weight: 800;">
                  🏢 <strong style="color: #FFFFFF !important; font-weight: 800;">Venue Campus:</strong>
                </td>
                <td class="session-data-value" style="padding: 8px 0; color: #F1F5F9 !important; font-weight: 600;">
                  ${venueName}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Next Steps Callout -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: rgba(0, 115, 187, 0.12); border-left: 4px solid #0073BB; border-radius: 0 10px 10px 0; margin: 0 0 20px 0;">
        <tr>
          <td style="padding: 16px 18px; font-size: 14px; color: #F1F5F9 !important; line-height: 1.6;">
            <strong style="color: #4F8EF7 !important; display: block; margin-bottom: 8px; font-size: 14px; font-weight: 800;">Next Steps for Your Event Day:</strong>
            <ul style="margin: 0; padding-left: 20px; color: #F1F5F9 !important;">
              <li style="margin-bottom: 6px; color: #FFFFFF !important;">Proceed directly to <strong style="color: #4F8EF7 !important;">${sessionLocation}</strong> for your assigned session.</li>
              <li style="margin-bottom: 6px; color: #FFFFFF !important;"><strong style="color: #FF9900 !important;">Keep this email handy on your mobile phone</strong> for session entrance and gate admission.</li>
              <li style="color: #FFFFFF !important;">Lunch counters and official swag distribution desks will activate during designated breaks.</li>
            </ul>
          </td>
        </tr>
      </table>

      <p style="margin: 0; color: #CBD5E1 !important; font-size: 14px;">
        Have an inspiring day learning and building with cloud technologies!
      </p>
    `;

  const html = wrapHtmlEmail({
    title: `Check-in Verified: ${sessionTitle} | ${eventName}`,
    preheader: `You are checked in for ${sessionTitle} at ${sessionLocation}. Keep this email handy on your phone for entrance.`,
    contentHtml,
    eventName,
    category: 'CHECK-IN CONFIRMATION'
  });

  return await sendEmail({
    to: attendee.email,
    subject: `✅ Check-in Verified: ${sessionTitle} | ${eventName}`,
    html
  });
}

/**
 * 2. Send Food / Meal Claim Notification
 */
export async function sendFoodClaimEmail({ attendee, event, resource }) {
  if (!attendee?.email) return { success: false, error: 'No email address' };

  const eventName = event?.name || 'AWS Community Day';
  const resourceName = resource?.name || 'Event Meal & Refreshments';
  const claimTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const contentHtml = `
      <p style="font-size: 16px; margin: 0 0 16px 0; color: #FFFFFF !important;">
        Hello <strong style="color: #FFFFFF !important; font-weight: 800;">${attendee.name}</strong>,
      </p>

      <p style="margin: 0 0 20px 0; color: #F1F5F9 !important; line-height: 1.6; font-size: 15px;">
        🍱 Your meal voucher for <strong style="color: #FF9900 !important;">${resourceName}</strong> has been successfully verified and claimed at the hospitality dining counter.
      </p>

      <!-- Claim Summary Card -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0A0F1D; border: 1px solid #1E293B; border-radius: 12px; margin: 0 0 20px 0; overflow: hidden;">
        <tr>
          <td style="padding: 14px 18px; background-color: #131E35; border-bottom: 1px solid #1E293B;">
            <span style="font-size: 11px; font-weight: 800; color: #10B981 !important; letter-spacing: 0.05em; text-transform: uppercase;">
              ● VOUCHER REDEEMED
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 18px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #FFFFFF !important;">
              <tr>
                <td class="session-data-label" style="padding: 8px 0; width: 145px; color: #FFFFFF !important; font-weight: 800;">
                  🍱 <strong style="color: #FFFFFF !important; font-weight: 800;">Meal Item:</strong>
                </td>
                <td class="session-data-value" style="padding: 8px 0; color: #FFFFFF !important; font-weight: 800;">
                  ${resourceName}
                </td>
              </tr>
              <tr>
                <td class="session-data-label" style="padding: 8px 0; width: 145px; color: #FFFFFF !important; font-weight: 800;">
                  🕒 <strong style="color: #FFFFFF !important; font-weight: 800;">Timestamp:</strong>
                </td>
                <td class="session-data-value" style="padding: 8px 0; color: #4F8EF7 !important; font-family: monospace; font-weight: 700;">
                  ${claimTime}
                </td>
              </tr>
              <tr>
                <td class="session-data-label" style="padding: 8px 0; width: 145px; color: #FFFFFF !important; font-weight: 800;">
                  🎟️ <strong style="color: #FFFFFF !important; font-weight: 800;">Booking ID:</strong>
                </td>
                <td class="session-data-value" style="padding: 8px 0;">
                  <code style="background-color: #1E293B; color: #FF9900 !important; padding: 3px 8px; border-radius: 5px; font-family: monospace; font-size: 13px; font-weight: 800;">
                    ${attendee.booking_id || attendee.id}
                  </code>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin: 0; color: #CBD5E1 !important; font-size: 14px;">
        Enjoy your lunch and refreshments!
      </p>
    `;

  const html = wrapHtmlEmail({
    title: `Meal Claimed: ${resourceName}`,
    preheader: `Your ${resourceName} voucher was verified successfully at ${claimTime}. Keep this email handy.`,
    contentHtml,
    eventName,
    category: 'HOSPITALITY DESK'
  });

  return await sendEmail({
    to: attendee.email,
    subject: `🍱 Meal Claimed: ${resourceName} | ${eventName}`,
    html
  });
}

/**
 * 3. Send Swag Kit Claim Notification
 */
export async function sendSwagClaimEmail({ attendee, event, resource }) {
  if (!attendee?.email) return { success: false, error: 'No email address' };

  const eventName = event?.name || 'AWS Community Day';
  const resourceName = resource?.name || 'Official Attendee Swag Kit';
  const claimTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const contentHtml = `
      <p style="font-size: 16px; margin: 0 0 16px 0; color: #FFFFFF !important;">
        Hello <strong style="color: #FFFFFF !important; font-weight: 800;">${attendee.name}</strong>,
      </p>

      <p style="margin: 0 0 20px 0; color: #F1F5F9 !important; line-height: 1.6; font-size: 15px;">
        🎁 You have collected your official <strong style="color: #4F8EF7 !important;">${resourceName}</strong> from the main distribution lobby!
      </p>

      <!-- Swag Claim Card -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0A0F1D; border: 1px solid #1E293B; border-radius: 12px; margin: 0 0 20px 0; overflow: hidden;">
        <tr>
          <td style="padding: 14px 18px; background-color: #131E35; border-bottom: 1px solid #1E293B;">
            <span style="font-size: 11px; font-weight: 800; color: #4F8EF7 !important; letter-spacing: 0.05em; text-transform: uppercase;">
              ● SWAG KIT DISTRIBUTED
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 18px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #FFFFFF !important;">
              <tr>
                <td class="session-data-label" style="padding: 8px 0; width: 145px; color: #FFFFFF !important; font-weight: 800;">
                  🎁 <strong style="color: #FFFFFF !important; font-weight: 800;">Goodie Pack:</strong>
                </td>
                <td class="session-data-value" style="padding: 8px 0; color: #FFFFFF !important; font-weight: 800;">
                  ${resourceName}
                </td>
              </tr>
              <tr>
                <td class="session-data-label" style="padding: 8px 0; width: 145px; color: #FFFFFF !important; font-weight: 800;">
                  🕒 <strong style="color: #FFFFFF !important; font-weight: 800;">Timestamp:</strong>
                </td>
                <td class="session-data-value" style="padding: 8px 0; color: #4F8EF7 !important; font-family: monospace; font-weight: 700;">
                  ${claimTime}
                </td>
              </tr>
              <tr>
                <td class="session-data-label" style="padding: 8px 0; width: 145px; color: #FFFFFF !important; font-weight: 800;">
                  👤 <strong style="color: #FFFFFF !important; font-weight: 800;">Attendee:</strong>
                </td>
                <td class="session-data-value" style="padding: 8px 0; color: #F1F5F9 !important; font-weight: 600;">
                  ${attendee.name}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin: 0; color: #CBD5E1 !important; font-size: 14px;">
        We hope you enjoy your exclusive community t-shirt, stickers, and builder merchandise!
      </p>
    `;

  const html = wrapHtmlEmail({
    title: `Swag Kit Claimed: ${resourceName}`,
    preheader: `Your ${resourceName} was claimed successfully at ${claimTime}. Keep this email handy.`,
    contentHtml,
    eventName,
    category: 'SWAG DESK'
  });

  return await sendEmail({
    to: attendee.email,
    subject: `🎁 Swag Kit Claimed: ${resourceName} | ${eventName}`,
    html
  });
}

/**
 * Dynamic Tag Substitution Helper
 */
export function substituteTags(templateText, { attendee = {}, event = {}, track = null, workshop = null }) {
  if (!templateText) return '';

  const isWorkshop = !!workshop;
  const sessionName = workshop ? workshop.name : track ? track.name : 'General Admission Session';
  const sessionLocation = workshop ? (workshop.location || 'Workshop Lab / Ground Floor') : (track ? (track.room_number || track.location || 'Main Auditorium Floor') : (event.venue || 'Campus Main Venue'));
  const sessionTime = workshop ? `${workshop.start_time || '10:00 AM'} - ${workshop.end_time || '01:00 PM'}` : (event.start_time ? `${event.start_time} - ${event.end_time}` : 'Full Day');

  const attendeeName = attendee.name || 'Valued Attendee';
  const firstName = attendeeName.split(' ')[0] || attendeeName;
  const bookingId = attendee.booking_id || attendee.registration_id || attendee.id || 'BK-ONEPASS';
  const qrIdentifier = attendee.qr_identifier || bookingId;
  const attendeeEmail = attendee.email || 'attendee@example.com';
  const ticketType = attendee.ticket_type || 'General Delegate';
  const eventName = event.name || 'AWS Community Day';
  const eventVenue = event.venue || 'Campus Auditorium Complex';

  return templateText
    .replace(/{{name}}/gi, attendeeName)
    .replace(/{{attendee_name}}/gi, attendeeName)
    .replace(/{{first_name}}/gi, firstName)
    .replace(/{{email}}/gi, attendeeEmail)
    .replace(/{{attendee_email}}/gi, attendeeEmail)
    .replace(/{{booking_id}}/gi, bookingId)
    .replace(/{{bookingid}}/gi, bookingId)
    .replace(/{{ticket_id}}/gi, bookingId)
    .replace(/{{registration_id}}/gi, bookingId)
    .replace(/{{qr_identifier}}/gi, qrIdentifier)
    .replace(/{{qr_code}}/gi, qrIdentifier)
    .replace(/{{qr}}/gi, qrIdentifier)
    .replace(/{{session}}/gi, sessionName)
    .replace(/{{session_name}}/gi, sessionName)
    .replace(/{{track}}/gi, sessionName)
    .replace(/{{track_name}}/gi, sessionName)
    .replace(/{{workshop}}/gi, sessionName)
    .replace(/{{workshop_name}}/gi, sessionName)
    .replace(/{{location}}/gi, sessionLocation)
    .replace(/{{room}}/gi, sessionLocation)
    .replace(/{{room_number}}/gi, sessionLocation)
    .replace(/{{session_location}}/gi, sessionLocation)
    .replace(/{{time}}/gi, sessionTime)
    .replace(/{{session_time}}/gi, sessionTime)
    .replace(/{{timing}}/gi, sessionTime)
    .replace(/{{ticket_type}}/gi, ticketType)
    .replace(/{{ticket}}/gi, ticketType)
    .replace(/{{event_name}}/gi, eventName)
    .replace(/{{event}}/gi, eventName)
    .replace(/{{venue}}/gi, eventVenue)
    .replace(/{{event_venue}}/gi, eventVenue)
    .replace(/{{campus}}/gi, eventVenue);
}

/**
 * 4. Campaign Broadcast Engine with Guaranteed High-Contrast Colors
 */
export async function sendCampaignBroadcast({
  eventId,
  audience = 'ALL', // 'ALL' | 'CHECKED_IN' | 'NOT_CHECKED_IN' | 'TRACK' | 'WORKSHOP'
  filterId = null,  // trackId or workshopId when audience is TRACK or WORKSHOP
  subject,
  messageBody,
  templateType = 'CUSTOM'
}) {
  const db = OnePassDB.getSnapshot();
  const event = db.events.find(e => e.id === eventId);
  if (!event) throw new Error('Event not found');

  let attendees = (db.attendees || []).filter(a => a.event_id === eventId && a.email);

  // Apply audience filtering
  if (audience === 'CHECKED_IN') {
    attendees = attendees.filter(a => a.check_in_status === 'CHECKED_IN');
  } else if (audience === 'NOT_CHECKED_IN') {
    attendees = attendees.filter(a => a.check_in_status === 'NOT_CHECKED_IN');
  } else if (audience === 'TRACK' && filterId) {
    attendees = attendees.filter(a => a.assigned_track_id === filterId);
  } else if (audience === 'WORKSHOP' && filterId) {
    attendees = attendees.filter(a => a.assigned_workshop_id === filterId);
  }

  if (attendees.length === 0) {
    return { success: true, sentCount: 0, failedCount: 0, totalTargeted: 0, message: 'No recipients matched the selected audience.' };
  }

  const tracks = db.tracks || [];
  const workshops = db.workshops || [];

  let sentCount = 0;
  let failedCount = 0;
  const errors = [];

  const categoryMap = {
    LOCATION_GUIDANCE: 'SESSION GUIDANCE',
    MEAL_ANNOUNCEMENT: 'MEAL SERVICE',
    SWAG_ANNOUNCEMENT: 'SWAG DISTRIBUTION',
    KEYNOTE_ALERT: 'KEYNOTE ALERT',
    CUSTOM: 'ANNOUNCEMENT'
  };
  const category = categoryMap[templateType] || 'ANNOUNCEMENT';

  for (const attendee of attendees) {
    try {
      const assignedTrk = tracks.find(t => t.id === attendee.assigned_track_id);
      const assignedWk = workshops.find(w => w.id === attendee.assigned_workshop_id);

      // Execute tag substitutions
      const context = { attendee, event, track: assignedTrk, workshop: assignedWk };
      const personalizedBody = substituteTags(messageBody, context);
      const personalizedSubject = substituteTags(subject, context);

      // Format message body into guaranteed high-contrast structured HTML
      let formattedHtml = '';
      if (personalizedBody.includes('<p>') || personalizedBody.includes('<table>')) {
        formattedHtml = personalizedBody;
      } else {
        const paragraphs = personalizedBody.split('\n\n');
        formattedHtml = paragraphs.map(p => {
          const lines = p.trim().split('\n');
          if (lines.every(l => l.trim().startsWith('•') || l.trim().startsWith('-') || l.trim().startsWith('*'))) {
            const items = lines.map(l => `<li style="margin-bottom: 8px; color: #FFFFFF !important;">${l.replace(/^[•\-\*]\s*/, '')}</li>`).join('');
            return `<ul style="margin: 0 0 18px 0; padding-left: 22px; color: #FFFFFF !important; line-height: 1.7; font-size: 15px;">${items}</ul>`;
          }
          return `<p style="margin: 0 0 18px 0; color: #FFFFFF !important; line-height: 1.7; font-size: 15px;">${p.replace(/\n/g, '<br/>')}</p>`;
        }).join('');
      }

      const html = wrapHtmlEmail({
        title: personalizedSubject,
        preheader: personalizedSubject,
        contentHtml: formattedHtml,
        eventName: event.name,
        category
      });

      const res = await sendEmail({
        to: attendee.email,
        subject: personalizedSubject,
        html
      });

      if (res.success) {
        sentCount++;
      } else {
        failedCount++;
        if (errors.length < 5) errors.push({ email: attendee.email, error: res.error?.message || 'Send failed' });
      }
    } catch (err) {
      failedCount++;
      if (errors.length < 5) errors.push({ email: attendee.email, error: err.message });
    }
  }

  return {
    success: true,
    sentCount,
    failedCount,
    totalTargeted: attendees.length,
    errors
  };
}

/**
 * 5. Send Test Preview Email with Guaranteed High-Contrast Colors
 */
export async function sendTestCampaignEmail({ eventId, subject, messageBody, testEmail, templateType = 'CUSTOM' }) {
  const db = OnePassDB.getSnapshot();
  const event = db.events.find(e => e.id === eventId) || { name: 'AWS Community Day', venue: 'Campus Main Auditorium' };
  const sampleTrack = db.tracks?.find(t => t.event_id === eventId) || { name: 'Track 1: Cloud & AI Architectures', location: 'Hall A / Ground Floor', room_number: 'Hall A' };
  const sampleWorkshop = db.workshops?.find(w => w.event_id === eventId) || null;

  const sampleAttendee = {
    name: 'Alex Mercer (Sample Preview)',
    email: testEmail,
    booking_id: 'BK-SAMPLE-99',
    qr_identifier: 'Alex-BK-SAMPLE-99',
    ticket_type: 'VIP Delegate'
  };

  const context = { attendee: sampleAttendee, event, track: sampleTrack, workshop: sampleWorkshop };
  const personalizedBody = substituteTags(messageBody, context);
  const personalizedSubject = `[TEST PREVIEW] ` + substituteTags(subject, context);

  let formattedHtml = '';
  if (personalizedBody.includes('<p>') || personalizedBody.includes('<table>')) {
    formattedHtml = personalizedBody;
  } else {
    const paragraphs = personalizedBody.split('\n\n');
    formattedHtml = paragraphs.map(p => {
      const lines = p.trim().split('\n');
      if (lines.every(l => l.trim().startsWith('•') || l.trim().startsWith('-') || l.trim().startsWith('*'))) {
        const items = lines.map(l => `<li style="margin-bottom: 8px; color: #FFFFFF !important;">${l.replace(/^[•\-\*]\s*/, '')}</li>`).join('');
        return `<ul style="margin: 0 0 18px 0; padding-left: 22px; color: #FFFFFF !important; line-height: 1.7; font-size: 15px;">${items}</ul>`;
      }
      return `<p style="margin: 0 0 18px 0; color: #FFFFFF !important; line-height: 1.7; font-size: 15px;">${p.replace(/\n/g, '<br/>')}</p>`;
    }).join('');
  }

  const categoryMap = {
    LOCATION_GUIDANCE: 'SESSION GUIDANCE',
    MEAL_ANNOUNCEMENT: 'MEAL SERVICE',
    SWAG_ANNOUNCEMENT: 'SWAG DISTRIBUTION',
    KEYNOTE_ALERT: 'KEYNOTE ALERT',
    CUSTOM: 'ANNOUNCEMENT'
  };
  const category = categoryMap[templateType] || 'TEST PREVIEW';

  const html = wrapHtmlEmail({
    title: personalizedSubject,
    preheader: personalizedSubject,
    contentHtml: formattedHtml,
    eventName: event.name,
    category
  });

  return await sendEmail({
    to: testEmail,
    subject: personalizedSubject,
    html
  });
}
