import { PortalDataPage } from '../portal/PortalPages';

export const ParentPortalHomePage = () => <PortalDataPage title="Parent Portal" endpoint="/api/parent/profile" />;
export const ParentPortalDashboardPage = () => <PortalDataPage title="Parent Dashboard" endpoint="/api/parent/student" />;
export const ParentPortalStudentPage = () => <PortalDataPage title="Parent Student" endpoint="/api/parent/student" />;
export const ParentPortalAttendancePage = () => <PortalDataPage title="Parent Attendance" endpoint="/api/parent/attendance" />;
export const ParentPortalFeesPage = () => <PortalDataPage title="Parent Fees" endpoint="/api/parent/fees" />;
export const ParentPortalResultsPage = () => <PortalDataPage title="Parent Results" endpoint="/api/parent/results" />;
export const ParentPortalCertificatesPage = () => <PortalDataPage title="Parent Certificates" endpoint="/api/parent/certificates" />;
export const ParentPortalAnnouncementsPage = () => <PortalDataPage title="Parent Announcements" endpoint="/api/parent/announcements" />;
