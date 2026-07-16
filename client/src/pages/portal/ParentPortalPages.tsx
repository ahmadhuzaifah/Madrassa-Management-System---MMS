import { PortalDataPage } from './PortalPages';

export const ParentPortalHomePage = () => <PortalDataPage title="Parent Portal" endpoint="/api/portal/parent/dashboard" />;
export const ParentPortalDashboardPage = () => <PortalDataPage title="Parent Dashboard" endpoint="/api/portal/parent/dashboard" />;
export const ParentPortalAttendancePage = () => <PortalDataPage title="Parent Attendance" endpoint="/api/portal/parent/attendance" />;
export const ParentPortalFeesPage = () => <PortalDataPage title="Parent Fees" endpoint="/api/portal/parent/fees" />;
export const ParentPortalResultsPage = () => <PortalDataPage title="Parent Results" endpoint="/api/portal/parent/results" />;
export const ParentPortalCertificatesPage = () => <PortalDataPage title="Parent Certificates" endpoint="/api/portal/parent/certificates" />;

