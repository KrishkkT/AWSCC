/**
 * Minimalist, high-deliverability HTML Email Generator & Variable Interpolator
 * Designed specifically for AWSCC Admin Email Campaigns
 * Compatible with Gmail, Apple Mail, Outlook, iOS & Android (Light & Dark modes)
 */

export const THEME_PRESETS = {
  slate: {
    id: 'slate',
    name: 'Minimal Slate',
    description: 'Clean deep slate background with sky-cyan accent',
    bg: '#090D16',
    cardBg: '#0F172A',
    borderColor: '#1E293B',
    accentColor: '#38BDF8',
    textColor: '#F8FAFC',
    mutedColor: '#94A3B8',
    isDark: true
  },
  monochrome: {
    id: 'monochrome',
    name: 'Monochrome Stark',
    description: 'Pure black & white minimalist elegance',
    bg: '#000000',
    cardBg: '#0A0A0A',
    borderColor: '#262626',
    accentColor: '#FFFFFF',
    textColor: '#EDEDED',
    mutedColor: '#A1A1AA',
    isDark: true
  },
  aws: {
    id: 'aws',
    name: 'Minimal AWS Cloud',
    description: 'Dark navy blue with subtle AWS Amber highlights',
    bg: '#080E1A',
    cardBg: '#0D1527',
    borderColor: '#1B2A4A',
    accentColor: '#FF9900',
    textColor: '#F1F5F9',
    mutedColor: '#94A3B8',
    isDark: true
  },
  cyan: {
    id: 'cyan',
    name: 'Cyber Cyan',
    description: 'Deep midnight canvas with luminous cyan highlights',
    bg: '#050B14',
    cardBg: '#0B1324',
    borderColor: '#152238',
    accentColor: '#00C2FF',
    textColor: '#F8FAFC',
    mutedColor: '#8892B0',
    isDark: true
  },
  emerald: {
    id: 'emerald',
    name: 'Clean Emerald',
    description: 'Refined dark forest tone with emerald green touch',
    bg: '#05110E',
    cardBg: '#0A1C17',
    borderColor: '#13352C',
    accentColor: '#10B981',
    textColor: '#ECFDF5',
    mutedColor: '#6EE7B7',
    isDark: true
  },
  paper_light: {
    id: 'paper_light',
    name: 'Crisp Minimal Paper',
    description: 'Ultra-clean white paper layout with deep navy ink',
    bg: '#F8FAFC',
    cardBg: '#FFFFFF',
    borderColor: '#E2E8F0',
    accentColor: '#2563EB',
    textColor: '#0F172A',
    mutedColor: '#64748B',
    isDark: false
  }
};

/**
 * Safely extracts a clean, human-readable name from an email address
 * Examples:
 * - "krishthakker508@gmail.com" -> "Krishthakker"
 * - "krish.thakker@gmail.com"    -> "Krish Thakker"
 * - "john_doe_99@gmail.com"     -> "John Doe"
 * - "alex-miller@domain.com"    -> "Alex Miller"
 * - "ce058@ddu.ac.in"           -> "Ce058"
 */
export function extractNameFromEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const localPart = email.split('@')[0]?.trim() || '';
  if (!localPart) return '';

  // Remove aliases like "+newsletter"
  const cleanLocal = localPart.split('+')[0];

  // Split by common separators (. _ -)
  const rawParts = cleanLocal.split(/[._\-]+/).filter(Boolean);
  if (rawParts.length === 0) return localPart;

  const words = rawParts.map(part => {
    // Strip trailing digits if remaining text has at least 3 letters (e.g. "thakker508" -> "thakker")
    const withoutTrailingDigits = part.replace(/\d+$/, '');
    const cleanWord = (withoutTrailingDigits.length >= 3) ? withoutTrailingDigits : part;
    return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
  });

  return words.join(' ');
}

/**
 * Universally interpolates any {{variable}} or ${variable} inside text using row data and context
 */
export function interpolateVariables(template, data = {}, context = {}) {
  if (!template) return '';
  let str = String(template);

  // Combine data + context
  const combined = { ...context, ...data };

  // Common aliases
  const aliasMap = {
    name: ['name', 'full_name', 'full name', 'attendee_name', 'attendee name', 'buyer_name'],
    first_name: ['first_name', 'firstname', 'first name'],
    email: ['email', 'email_address', 'email address', 'email id', 'email_id'],
    phone: ['phone', 'mobile', 'contact', 'phone_number', 'phone number'],
    company: ['company', 'organization', 'college', 'institute', 'institution', 'university'],
    role: ['role', 'designation', 'position', 'ticket', 'ticket_type', 'ticket type'],
  };

  for (const [standardKey, aliases] of Object.entries(aliasMap)) {
    if (!combined[standardKey]) {
      for (const alias of aliases) {
        if (combined[alias]) {
          combined[standardKey] = combined[alias];
          break;
        }
      }
    }
  }

  // If email is provided, and name is missing, identical to email, or a generic placeholder
  const rawEmail = combined.email ? String(combined.email).trim() : '';
  const currentName = combined.name ? String(combined.name).trim() : '';
  const isGenericName = !currentName ||
    currentName.toLowerCase() === rawEmail.toLowerCase() ||
    /^(recipient|participant|member|sample recipient|sample|user|attendee|attendee name|full name|\$\{\s*name\s*\}|\{\{\s*name\s*\}\})$/i.test(currentName);

  if (rawEmail && isGenericName) {
    const derivedName = extractNameFromEmail(rawEmail);
    if (derivedName) {
      combined.name = derivedName;
    }
  }

  // Derive first_name if name is present
  if (combined.name) {
    const currentFirstName = combined.first_name ? String(combined.first_name).trim() : '';
    const isGenericFirstName = !currentFirstName ||
      currentFirstName.toLowerCase() === rawEmail.toLowerCase() ||
      /^(recipient|participant|member|sample)$/i.test(currentFirstName);

    if (isGenericFirstName) {
      combined.first_name = String(combined.name).trim().split(' ')[0] || combined.name;
    }
  }

  // Replace both {{ tag }} and ${ tag } patterns
  return str.replace(/(?:\{\{\s*([a-zA-Z0-9_\-\.\s]+?)\s*\}\}|\$\{\s*([a-zA-Z0-9_\-\.\s]+?)\s*\})/g, (match, p1, p2) => {
    const rawKey = p1 || p2;
    if (!rawKey) return match;
    const trimmedKey = rawKey.trim();

    // Direct match
    if (combined[trimmedKey] !== undefined && combined[trimmedKey] !== null) {
      return String(combined[trimmedKey]);
    }

    // Lowercase match
    const lowerKey = trimmedKey.toLowerCase();
    for (const [k, v] of Object.entries(combined)) {
      if (k.toLowerCase() === lowerKey && v !== undefined && v !== null) {
        return String(v);
      }
    }

    // Keep intact if not found
    return match;
  });
}

/**
 * Converts raw markdown/text with paragraphs and bullet points into high-contrast HTML
 */
export function formatContentToHtml(rawText, textColor = '#FFFFFF') {
  if (!rawText) return '';

  // If already full HTML with tags
  if (rawText.includes('<p>') || rawText.includes('<div') || rawText.includes('<table')) {
    return rawText;
  }

  const paragraphs = String(rawText).split(/\n\s*\n/);
  return paragraphs.map(p => {
    const lines = p.trim().split('\n');
    const isBulletList = lines.length > 0 && lines.every(l => {
      const trimmed = l.trim();
      return trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*');
    });

    if (isBulletList) {
      const items = lines.map(l => {
        const itemText = l.trim().replace(/^[•\-\*]\s*/, '');
        return `<li style="margin-bottom: 8px; color: ${textColor}; line-height: 1.6;">${itemText}</li>`;
      }).join('');
      return `<ul style="margin: 0 0 20px 0; padding-left: 20px; color: ${textColor}; font-size: 15px;">${items}</ul>`;
    }

    const htmlContent = lines.map(l => l.trim()).join('<br/>');
    return `<p style="margin: 0 0 18px 0; color: ${textColor}; line-height: 1.7; font-size: 15px;">${htmlContent}</p>`;
  }).join('');
}

/**
 * Generates the full minimalist HTML email
 */
export function buildMinimalistEmailHtml({
  title = 'Email Announcement',
  preheader = '',
  contentHtml = '',
  rawBody = '',
  header = {},
  footer = {},
  theme = {},
  button = {},
  attachments = []
}) {
  const activeTheme = {
    ...THEME_PRESETS.aws,
    ...(typeof theme === 'string' ? (THEME_PRESETS[theme] || THEME_PRESETS.aws) : theme)
  };

  const {
    bg = '#080E1A',
    cardBg = '#0D1527',
    borderColor = '#1B2A4A',
    accentColor = '#FF9900',
    textColor = '#F1F5F9',
    mutedColor = '#94A3B8',
    isDark = true
  } = activeTheme;

  // Solid sub-panel backgrounds (avoid rgba() which is stripped by Gmail/Outlook)
  const badgeBg = isDark ? '#141E34' : '#F1F5F9';
  const footerSubBg = isDark ? '#080E1C' : '#F8FAFC';
  const attachmentBg = isDark ? '#111A2E' : '#F1F5F9';

  const headerConfig = {
    enabled: true,
    style: 'accent_bar', // 'accent_bar' | 'clean_badge' | 'monoline' | 'pure_text' | 'none'
    title: 'AWS Cloud Community',
    subtitle: '',
    badgeText: 'ANNOUNCEMENT',
    ...header
  };

  const footerConfig = {
    enabled: true,
    style: 'minimal_line', // 'minimal_line' | 'signoff' | 'detailed' | 'none'
    customText: 'AWS Student Builder Group • Dharmsinh Desai University',
    showUnsubscribe: true,
    ...footer
  };

  const buttonConfig = {
    enabled: false,
    text: 'View Details',
    url: '',
    style: 'filled', // 'filled' | 'outline' | 'pill'
    ...button
  };

  // Body content
  const renderedBody = contentHtml || formatContentToHtml(rawBody, textColor);

  // Build Minimal Header HTML
  let headerHtml = '';
  if (headerConfig.enabled && headerConfig.style !== 'none') {
    if (headerConfig.style === 'accent_bar') {
      headerHtml = `
        <!-- Top Accent Bar Header -->
        <tr>
          <td height="3" bgcolor="${accentColor}" style="background-color: ${accentColor}; line-height: 3px; font-size: 3px;">&nbsp;</td>
        </tr>
        <tr>
          <td bgcolor="${cardBg}" style="background-color: ${cardBg}; background-image: linear-gradient(${cardBg}, ${cardBg}); padding: 24px 28px 18px 28px; border-bottom: 1px solid ${borderColor};">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${cardBg}" style="background-color: ${cardBg}; background-image: linear-gradient(${cardBg}, ${cardBg});">
              <tr>
                <td bgcolor="${cardBg}" style="background-color: ${cardBg}; background-image: linear-gradient(${cardBg}, ${cardBg});">
                  <span style="font-size: 11px; font-weight: 700; color: ${accentColor}; text-transform: uppercase; letter-spacing: 0.12em; font-family: monospace;">
                    ${headerConfig.badgeText || 'AWS SBG DDU'}
                  </span>
                </td>
              </tr>
              ${headerConfig.title ? `
              <tr>
                <td colspan="2" bgcolor="${cardBg}" style="background-color: ${cardBg}; background-image: linear-gradient(${cardBg}, ${cardBg}); padding-top: 10px;">
                  <h1 style="margin: 0; color: ${textColor}; font-size: 20px; font-weight: 800; line-height: 1.35; letter-spacing: -0.01em;">
                    ${headerConfig.title}
                  </h1>
                  ${headerConfig.subtitle ? `
                  <p style="margin: 4px 0 0 0; color: ${mutedColor}; font-size: 13px; line-height: 1.4;">
                    ${headerConfig.subtitle}
                  </p>` : ''}
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>
      `;
    } else if (headerConfig.style === 'clean_badge') {
      headerHtml = `
        <!-- Minimal Badge Header -->
        <tr>
          <td bgcolor="${cardBg}" style="background-color: ${cardBg}; background-image: linear-gradient(${cardBg}, ${cardBg}); padding: 24px 28px 18px 28px; border-bottom: 1px solid ${borderColor};">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" bgcolor="${cardBg}" style="background-color: ${cardBg}; background-image: linear-gradient(${cardBg}, ${cardBg});">
              <tr>
                <td bgcolor="${badgeBg}" style="background-color: ${badgeBg}; background-image: linear-gradient(${badgeBg}, ${badgeBg}); border: 1px solid ${borderColor}; border-radius: 9999px; padding: 4px 14px;">
                  <span style="font-size: 11px; font-weight: 700; color: ${accentColor}; letter-spacing: 0.06em; text-transform: uppercase; font-family: monospace;">
                    ● ${headerConfig.badgeText || 'ANNOUNCEMENT'}
                  </span>
                </td>
              </tr>
            </table>
            ${headerConfig.title ? `
            <div style="margin-top: 12px;">
              <h1 style="margin: 0; color: ${textColor}; font-size: 20px; font-weight: 800; line-height: 1.35; letter-spacing: -0.01em;">
                ${headerConfig.title}
              </h1>
              ${headerConfig.subtitle ? `<p style="margin: 4px 0 0 0; color: ${mutedColor}; font-size: 13px;">${headerConfig.subtitle}</p>` : ''}
            </div>` : ''}
          </td>
        </tr>
      `;
    } else if (headerConfig.style === 'monoline') {
      headerHtml = `
        <!-- Sleek Monoline Header -->
        <tr>
          <td bgcolor="${cardBg}" style="background-color: ${cardBg}; background-image: linear-gradient(${cardBg}, ${cardBg}); padding: 24px 28px 16px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${cardBg}" style="background-color: ${cardBg}; background-image: linear-gradient(${cardBg}, ${cardBg});">
              <tr>
                <td bgcolor="${cardBg}" style="background-color: ${cardBg}; background-image: linear-gradient(${cardBg}, ${cardBg}); border-bottom: 2px solid ${accentColor}; padding-bottom: 12px;">
                  <h1 style="margin: 0; color: ${textColor}; font-size: 19px; font-weight: 800; letter-spacing: -0.01em;">
                    ${headerConfig.title || 'AWS Community'}
                  </h1>
                  ${headerConfig.subtitle ? `<span style="display: block; margin-top: 2px; color: ${mutedColor}; font-size: 12px;">${headerConfig.subtitle}</span>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    } else {
      // Pure Text
      headerHtml = `
        <tr>
          <td bgcolor="${cardBg}" style="background-color: ${cardBg}; background-image: linear-gradient(${cardBg}, ${cardBg}); padding: 24px 28px 12px 28px;">
            <h1 style="margin: 0; color: ${textColor}; font-size: 20px; font-weight: 800;">
              ${headerConfig.title}
            </h1>
            ${headerConfig.subtitle ? `<p style="margin: 4px 0 0 0; color: ${mutedColor}; font-size: 13px;">${headerConfig.subtitle}</p>` : ''}
          </td>
        </tr>
      `;
    }
  }

  // Build CTA Button HTML
  let buttonHtml = '';
  if (buttonConfig.enabled && buttonConfig.text && buttonConfig.url) {
    const isPill = buttonConfig.style === 'pill';
    const isOutline = buttonConfig.style === 'outline';
    const btnBg = isOutline ? 'transparent' : accentColor;
    const btnTextColor = isOutline ? accentColor : (isDark && accentColor !== '#FFFFFF' ? '#0A0F1D' : '#0F172A');
    const btnBorder = isOutline ? `1px solid ${accentColor}` : 'none';
    const borderRadius = isPill ? '9999px' : '8px';

    buttonHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 16px 0;">
        <tr>
          <td align="center" bgcolor="${btnBg}" style="background-color: ${btnBg}; background-image: linear-gradient(${btnBg}, ${btnBg}); border: ${btnBorder}; border-radius: ${borderRadius};">
            <a href="${buttonConfig.url}" target="_blank" style="display: inline-block; padding: 12px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 700; color: ${btnTextColor}; text-decoration: none; border-radius: ${borderRadius}; letter-spacing: 0.02em;">
              ${buttonConfig.text} &rarr;
            </a>
          </td>
        </tr>
      </table>
    `;
  }

  // Build Attachments Note HTML if present
  let attachmentsHtml = '';
  if (attachments && attachments.length > 0) {
    const count = attachments.length;
    const names = attachments.map(a => a.filename).join(', ');
    attachmentsHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${attachmentBg}" style="background-color: ${attachmentBg}; background-image: linear-gradient(${attachmentBg}, ${attachmentBg}); border: 1px dashed ${borderColor}; border-radius: 8px; margin-top: 24px;">
        <tr>
          <td bgcolor="${attachmentBg}" style="background-color: ${attachmentBg}; background-image: linear-gradient(${attachmentBg}, ${attachmentBg}); padding: 12px 16px; font-size: 12px; color: ${mutedColor}; font-family: monospace;">
            📎 <strong style="color: ${textColor}; font-weight: 700;">${count} Attached File${count > 1 ? 's' : ''}:</strong> ${names}
          </td>
        </tr>
      </table>
    `;
  }

  // Build Minimal Footer HTML
  let footerHtml = '';
  if (footerConfig.enabled && footerConfig.style !== 'none') {
    if (footerConfig.style === 'signoff') {
      footerHtml = `
        <tr>
          <td bgcolor="${footerSubBg}" style="background-color: ${footerSubBg}; background-image: linear-gradient(${footerSubBg}, ${footerSubBg}); padding: 20px 28px; border-top: 1px solid ${borderColor};">
            <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: ${textColor};">
              ${footerConfig.customText || 'Warm regards,'}
            </p>
            <p style="margin: 0; font-size: 12px; color: ${mutedColor};">
              AWS Student Builder Group • DDU Chapter
            </p>
          </td>
        </tr>
      `;
    } else if (footerConfig.style === 'detailed') {
      footerHtml = `
        <tr>
          <td bgcolor="${footerSubBg}" style="background-color: ${footerSubBg}; background-image: linear-gradient(${footerSubBg}, ${footerSubBg}); padding: 22px 28px; border-top: 1px solid ${borderColor}; text-align: center;">
            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: ${textColor};">
              ${footerConfig.customText || 'AWS Student Builder Group at DDU'}
            </p>
            <p style="margin: 0; font-size: 11px; color: ${mutedColor}; line-height: 1.5;">
              You received this message because you are a registered participant or member. If you have any inquiries, reach us at contact@aws.ddu.ac.in.
            </p>
          </td>
        </tr>
      `;
    } else {
      // Default: Minimal Line
      footerHtml = `
        <tr>
          <td bgcolor="${cardBg}" style="background-color: ${cardBg}; background-image: linear-gradient(${cardBg}, ${cardBg}); padding: 18px 28px; border-top: 1px solid ${borderColor}; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: ${mutedColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${footerConfig.customText || 'AWS Student Builder Group • DDU Chapter'}
            </p>
          </td>
        </tr>
      `;
    }
  }

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
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body, table, td, a, p { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background: ${bg} !important;
      background-color: ${bg} !important;
      color: ${textColor} !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    /* Force email clients not to invert background */
    u + .body .email-wrapper {
      background: ${bg} !important;
      background-color: ${bg} !important;
    }
    u + .body .email-card {
      background: ${cardBg} !important;
      background-color: ${cardBg} !important;
    }
    [data-ogsc] .email-wrapper {
      background: ${bg} !important;
      background-color: ${bg} !important;
    }
    [data-ogsc] .email-card {
      background: ${cardBg} !important;
      background-color: ${cardBg} !important;
    }
    @media screen and (max-width: 600px) {
      .email-shell { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .content-cell { padding: 22px 18px !important; }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    table, td, p, h1, span, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body class="body" bgcolor="${bg}" style="background-color: ${bg}; background-image: linear-gradient(${bg}, ${bg}); margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
  <!-- Hidden Preheader -->
  <div style="display: none; font-size: 1px; color: ${bg}; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${preheader || title} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <!-- Full-Width Background Wrapper Div & Table for Gmail -->
  <div class="email-wrapper" style="background-color: ${bg}; background-image: linear-gradient(${bg}, ${bg}); width: 100%; min-width: 100%; margin: 0; padding: 0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${bg}" class="email-wrapper email-bg" style="width: 100%; min-width: 100%; table-layout: fixed; background-color: ${bg}; background-image: linear-gradient(${bg}, ${bg}); margin: 0; padding: 0;">
      <tr>
        <td align="center" bgcolor="${bg}" class="email-wrapper email-bg" style="background-color: ${bg}; background-image: linear-gradient(${bg}, ${bg}); padding: 24px 12px; margin: 0;">
          
          <!--[if (gte mso 9)|(IE)]>
          <table width="600" align="center" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td bgcolor="${cardBg}">
          <![endif]-->

          <!-- Email Container Card (600px Max) -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${cardBg}" class="email-card email-shell" style="max-width: 600px; width: 100%; background-color: ${cardBg}; background-image: linear-gradient(${cardBg}, ${cardBg}); border-radius: 14px; border: 1px solid ${borderColor}; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.35);">
            
            ${headerHtml}

            <!-- Main Content Area -->
            <tr>
              <td bgcolor="${cardBg}" class="email-card content-cell" style="background-color: ${cardBg}; background-image: linear-gradient(${cardBg}, ${cardBg}); padding: 28px 28px 24px 28px; color: ${textColor}; font-size: 15px; line-height: 1.7;">
                ${renderedBody}
                ${buttonHtml}
                ${attachmentsHtml}
              </td>
            </tr>

            ${footerHtml}

          </table>

          <!--[if (gte mso 9)|(IE)]>
              </td>
            </tr>
          </table>
          <![endif]-->

        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `.trim();
}
