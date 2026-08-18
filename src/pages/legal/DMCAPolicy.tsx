import { Copyright } from 'lucide-react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

/**
 * DMCA Notice & Takedown Policy.
 *
 * Required for safe-harbor protection under 17 U.S.C. § 512.
 * Includes designated agent contact, notice elements, counter-notice procedure,
 * and repeat-infringer policy.
 */
const DMCAPolicy = () => (
  <LegalPageLayout
    title="DMCA Copyright Policy"
    metaDescription="Brikly's Digital Millennium Copyright Act (DMCA) notice and takedown procedure, including designated agent contact information."
    effectiveDate="April 13, 2026"
    lastUpdated="April 13, 2026"
    icon={<Copyright className="h-5 w-5 text-primary" aria-hidden="true" />}
    relatedLinks={[
      { label: 'Terms of Service', href: '/terms-of-service' },
      { label: 'Acceptable Use Policy', href: '/acceptable-use-policy' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
    ]}
  >
    <p>
      Brikly respects the intellectual property rights of others and expects users of the Service
      to do the same. In accordance with the Digital Millennium Copyright Act of 1998 ("
      <strong>DMCA</strong>"), 17 U.S.C. § 512, we will respond expeditiously to claims of copyright
      infringement that are reported to our Designated Copyright Agent identified below.
    </p>

    <h2>1. Filing a DMCA Notice</h2>
    <p>
      If you believe that material accessible on or through the Service infringes a copyright you
      own or control, you may submit a written notice that includes <strong>all</strong> of the
      following (17 U.S.C. § 512(c)(3)):
    </p>
    <ol>
      <li>
        A physical or electronic signature of the owner, or a person authorized to act on behalf of
        the owner, of an exclusive right that is allegedly infringed;
      </li>
      <li>
        Identification of the copyrighted work claimed to have been infringed (or a representative
        list if multiple works are involved);
      </li>
      <li>
        Identification of the material that is claimed to be infringing and information reasonably
        sufficient to permit us to locate the material (URL, project ID, file name, etc.);
      </li>
      <li>
        Information reasonably sufficient to permit us to contact you, including your name, postal
        address, telephone number, and email address;
      </li>
      <li>
        A statement that you have a good-faith belief that use of the material in the manner
        complained of is not authorized by the copyright owner, its agent, or the law;
      </li>
      <li>
        A statement, made under penalty of perjury, that the information in the notification is
        accurate and that you are authorized to act on behalf of the owner.
      </li>
    </ol>

    <h2>2. Designated Copyright Agent</h2>
    <address className="not-italic bg-muted p-4 rounded-md">
      <strong>DMCA Agent — Brikly</strong>
      <br />
      Email: <a href="mailto:dmca@brikly.net">dmca@brikly.net</a>
      <br />
      DMCA notices are received at the email address above. A designated agent must also be registered with the U.S. Copyright Office for safe-harbor purposes.
    </address>
    <p>
      Brikly's Designated Copyright Agent is registered with the United States Copyright Office.
      Misrepresentations in a DMCA notice may result in liability under 17 U.S.C. § 512(f).
    </p>

    <h2>3. Counter-Notification</h2>
    <p>
      If you believe that material you submitted was removed or disabled by mistake or
      misidentification, you may file a counter-notice with the elements required by 17 U.S.C. §
      512(g)(3), including:
    </p>
    <ul>
      <li>Your physical or electronic signature;</li>
      <li>
        Identification of the material that has been removed or disabled and the location at which
        it appeared before removal;
      </li>
      <li>
        A statement under penalty of perjury that you have a good-faith belief that the material
        was removed as a result of mistake or misidentification;
      </li>
      <li>
        Your name, address, telephone number, and a statement that you consent to the jurisdiction
        of the Federal District Court for the judicial district in which your address is located
        (or, if outside the United States, the federal court for any judicial district in which
        Brikly may be found), and that you will accept service of process from the complaining
        party.
      </li>
    </ul>
    <p>
      Send counter-notices to the Designated Copyright Agent at the address above.
    </p>

    <h2>4. Repeat-Infringer Policy</h2>
    <p>
      Consistent with 17 U.S.C. § 512(i), Brikly will, in appropriate circumstances, terminate the
      accounts of users who are determined to be repeat infringers. Determinations are made in our
      reasonable discretion based on the totality of the circumstances.
    </p>

    <h2>5. Other Intellectual-Property Claims</h2>
    <p>
      For trademark, patent, trade-secret, right-of-publicity, or other non-copyright IP claims,
      please contact <a href="mailto:legal@brikly.net">legal@brikly.net</a> with a description of
      the claim and supporting documentation.
    </p>
  </LegalPageLayout>
);

export default DMCAPolicy;
